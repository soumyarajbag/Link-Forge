import { ObjectId } from 'mongodb';
import type { AppConfig } from '../config/env.js';
import { errors } from '../utils/app-error.js';
import type { Actor } from '../models/actor.model.js';
import type { LinkDocument, RoutingRule } from '../models/link.model.js';
import type { ListOptions } from '../models/list-options.model.js';
import type { LinkRepository } from '../repositories/link.repository.js';
import type { MongoAnalyticsRepository } from '../repositories/analytics.repository.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import { AuthorizationService } from './authorization.service.js';
import { AuditService } from './audit.service.js';
import { hashIp, hashPassword, randomToken, verifyPassword } from '../utils/crypto.js';
import { hostFromUrl, normalizeDestination, normalizeHost, normalizeSlug, validateDestination, validSlug } from '../utils/url.js';
import { isDuplicateKey } from '../config/database.js';

export type RoutingRuleInput = Omit<RoutingRule, 'id' | 'priority' | 'enabled'> & Partial<Pick<RoutingRule, 'id' | 'priority' | 'enabled'>>;
export type CreateLinkInput = {
  workspaceId: ObjectId;
  destinationUrl: string;
  slug?: string;
  redirectStatus?: 301 | 302 | 307 | 308;
  title?: string;
  description?: string;
  tags?: string[];
  folder?: string;
  campaign?: string;
  expiresAt?: Date;
  maxClicks?: number;
  password?: string;
  routingRules?: RoutingRuleInput[];
  qr?: { foreground?: string; background?: string; size?: number };
};
export type ResolveInput = {
  password?: string;
  country?: string;
  deviceClass?: string;
  os?: string;
  language?: string;
  referrer?: string;
  ip?: string;
};

export class LinkService {
  constructor(
    private readonly links: LinkRepository,
    private readonly analytics: MongoAnalyticsRepository,
    private readonly admin: AdminRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  async create(actor: Actor, input: CreateLinkInput) {
    await this.authorization.workspace(actor, input.workspaceId, 'link:write');
    if (!validateDestination(input.destinationUrl)) throw errors.validation();
    const destination = normalizeDestination(input.destinationUrl);
    if (await this.admin.isBlocked(destination.toLowerCase())) throw errors.forbidden();
    const hostname = normalizeHost(this.config.defaultShortDomain);
    const suppliedSlug = normalizeSlug(input.slug || '');
    if (suppliedSlug && !validSlug(suppliedSlug)) throw errors.validation('invalid slug');
    const now = new Date();
    const passwordHash = input.password
      ? await hashPassword(input.password, this.config.passwordMemoryKiB, this.config.passwordIterations, this.config.passwordParallelism)
      : undefined;
    const link: Omit<LinkDocument, '_id'> = {
      workspace_id: input.workspaceId,
      hostname,
      slug: suppliedSlug,
      destination_url: destination,
      redirect_status: input.redirectStatus || 302,
      state: 'active',
      title: input.title?.trim(),
      description: input.description?.trim(),
      tags: cleanStrings(input.tags || []),
      folder: input.folder?.trim(),
      campaign: input.campaign?.trim(),
      expires_at: input.expiresAt,
      max_clicks: input.maxClicks || 0,
      click_count: 0,
      routing_rules: normalizeRules(input.routingRules || []),
      password_hash: passwordHash,
      qr: { foreground: input.qr?.foreground || '#000000', background: input.qr?.background || '#ffffff', size: input.qr?.size || 512 },
      created_by: actor.user._id,
      created_at: now,
      updated_at: now,
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      link.slug = suppliedSlug && attempt === 0 ? suppliedSlug : randomToken(6).toLowerCase();
      try {
        const created = await this.links.create(link);
        await this.audit.record(actor.user._id, 'link.created', 'link', created._id.toHexString(), created.workspace_id);
        return created;
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;
      }
    }
    throw errors.conflict();
  }
  list(actor: Actor, workspaceId: ObjectId, options: ListOptions) {
    return this.authorization.workspace(actor, workspaceId, 'link:read').then(() => this.links.list(workspaceId, options));
  }
  async get(actor: Actor, linkId: ObjectId, permission = 'link:read') {
    const link = await this.links.findById(linkId);
    if (!link) throw errors.notFound();
    await this.authorization.workspace(actor, link.workspace_id, permission);
    return link;
  }
  async update(actor: Actor, linkId: ObjectId, input: Record<string, any>) {
    const link = await this.get(actor, linkId, 'link:write');
    const mutable = link as unknown as Record<string, any>;
    if (input.destination_url !== undefined) {
      if (!validateDestination(input.destination_url) || (await this.admin.isBlocked(String(input.destination_url).toLowerCase())))
        throw errors.validation();
      link.destination_url = normalizeDestination(input.destination_url);
    }
    if (input.slug !== undefined) {
      const slug = normalizeSlug(input.slug);
      if (!validSlug(slug)) throw errors.validation();
      link.slug = slug;
    }
    if (input.redirect_status !== undefined) {
      if (![301, 302, 307, 308].includes(input.redirect_status)) throw errors.validation();
      link.redirect_status = input.redirect_status;
    }
    for (const field of ['title', 'description', 'folder', 'campaign'])
      if (input[field] !== undefined) mutable[field] = String(input[field] || '').trim();
    if (input.tags !== undefined) link.tags = cleanStrings(input.tags);
    if (input.expires_at !== undefined) link.expires_at = input.expires_at;
    if (input.max_clicks !== undefined) link.max_clicks = input.max_clicks;
    if (input.state !== undefined) link.state = input.state;
    if (input.routing_rules !== undefined) link.routing_rules = normalizeRules(input.routing_rules);
    if (input.qr !== undefined) link.qr = { ...link.qr, ...input.qr };
    if (input.password !== undefined)
      link.password_hash = input.password
        ? await hashPassword(input.password, this.config.passwordMemoryKiB, this.config.passwordIterations, this.config.passwordParallelism)
        : undefined;
    link.updated_at = new Date();
    try {
      await this.links.update(link);
    } catch (error) {
      if (isDuplicateKey(error)) throw errors.conflict();
      throw error;
    }
    await this.audit.record(actor.user._id, 'link.updated', 'link', link._id.toHexString(), link.workspace_id);
    return link;
  }
  async delete(actor: Actor, linkId: ObjectId) {
    const link = await this.get(actor, linkId, 'link:write');
    link.state = 'deleted';
    link.deleted_at = new Date();
    link.updated_at = new Date();
    await this.links.update(link);
    await this.audit.record(actor.user._id, 'link.deleted', 'link', link._id.toHexString(), link.workspace_id);
  }
  setState(actor: Actor, linkId: ObjectId, state: 'active' | 'paused') {
    return this.update(actor, linkId, { state });
  }
  async resolve(hostValue: string, slugValue: string, input: ResolveInput) {
    const link = await this.links.findByHostSlug(normalizeHost(hostValue), normalizeSlug(slugValue));
    if (!link) throw errors.notFound();
    const now = new Date();
    if (
      link.state !== 'active' ||
      (link.expires_at && now > link.expires_at) ||
      (link.max_clicks > 0 && link.click_count >= link.max_clicks)
    )
      throw errors.linkUnavailable();
    if (link.password_hash && !(await verifyPassword(link.password_hash, input.password || ''))) throw errors.passwordRequired();
    const event = {
      link_id: link._id,
      workspace_id: link.workspace_id,
      occurred_at: now,
      event_type: 'redirect' as const,
      unique_key: `${hashIp(input.ip || '')}:${now.toISOString().slice(0, 10)}`,
      is_unique: true,
      bot_class: 'unknown',
      country: input.country?.trim().toUpperCase(),
      device_class: input.deviceClass,
      os: input.os,
      language: input.language,
      referrer_host: hostFromUrl(input.referrer || ''),
      retention_until: new Date(now.getTime() + this.config.analyticsRetentionDays * 86_400_000),
    };
    const writes = await Promise.allSettled([this.analytics.createEvent(event), this.links.incrementClicks(link._id, now)]);
    for (const write of writes)
      if (write.status === 'rejected')
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'redirect analytics write failed',
            link_id: link._id.toHexString(),
            error: write.reason instanceof Error ? write.reason.message : String(write.reason),
          }),
        );
    return { link, destination: chooseDestination(link, input), status: link.redirect_status };
  }
  async analyticsFor(actor: Actor, linkId: ObjectId, from: Date, to: Date) {
    const link = await this.get(actor, linkId, 'analytics:read');
    if (to <= from || to.getTime() - from.getTime() > 366 * 86_400_000) throw errors.validation();
    return this.analytics.summary(link._id, from, to);
  }
  async report(linkId: ObjectId, reason: string, details: string) {
    const link = await this.links.findById(linkId);
    if (!link) throw errors.notFound();
    const now = new Date();
    await this.admin.createAbuse({ link_id: linkId, reason, details, status: 'open', created_at: now, updated_at: now });
  }
}

function cleanStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter((value) => value && value.length <= 64))];
}
function normalizeRules(values: RoutingRuleInput[]): RoutingRule[] {
  return values.map((rule, index) => ({
    ...rule,
    id: rule.id || new ObjectId().toHexString(),
    priority: rule.priority || index + 1,
    enabled: rule.enabled !== false,
  }));
}
function matches(values: string[] | undefined, actual: string): boolean {
  return !values?.length || values.some((value) => value.trim().toLowerCase() === actual.trim().toLowerCase());
}
function chooseDestination(link: LinkDocument, input: ResolveInput): string {
  const rules = [...link.routing_rules].sort((left, right) => left.priority - right.priority);
  for (const rule of rules)
    if (
      rule.enabled &&
      matches(rule.country_codes, input.country || '') &&
      matches(rule.device_classes, input.deviceClass || '') &&
      matches(rule.os_names, input.os || '') &&
      matches(rule.language_codes, input.language || '') &&
      validateDestination(rule.destination)
    )
      return rule.destination;
  return link.destination_url;
}
