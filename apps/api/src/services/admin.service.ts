import { ObjectId } from 'mongodb';
import type { Actor } from '../models/actor.model.js';
import type { ListOptions } from '../models/list-options.model.js';
import type { AdminRepository } from '../repositories/admin.repository.js';
import type { LinkRepository } from '../repositories/link.repository.js';
import { AuthorizationService } from './authorization.service.js';
import { AuditService } from './audit.service.js';
import { errors } from '../utils/app-error.js';

export class AdminService {
  constructor(
    private readonly admin: AdminRepository,
    private readonly links: LinkRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}
  overview(actor: Actor) {
    this.authorization.requirePlatformAdmin(actor);
    return this.admin.countAll();
  }
  users(actor: Actor, options: ListOptions, listUsers: (options: ListOptions) => Promise<any>) {
    this.authorization.requirePlatformAdmin(actor);
    return listUsers(options);
  }
  workspaces(actor: Actor, options: ListOptions) {
    this.authorization.requirePlatformAdmin(actor);
    return this.admin.listWorkspaces(options);
  }
  linksList(actor: Actor, options: ListOptions) {
    this.authorization.requirePlatformAdmin(actor);
    return this.admin.listLinks(options);
  }
  auditLogs(actor: Actor, options: ListOptions) {
    this.authorization.requirePlatformAdmin(actor);
    return this.admin.listAudit(options);
  }
  abuseReports(actor: Actor, options: ListOptions) {
    this.authorization.requirePlatformAdmin(actor);
    return this.admin.listAbuse(options);
  }
  blocked(actor: Actor) {
    this.authorization.requirePlatformAdmin(actor);
    return this.admin.listBlocked();
  }
  async block(actor: Actor, pattern: string, reason: string) {
    this.authorization.requirePlatformAdmin(actor);
    await this.admin.createBlocked({
      pattern: pattern.trim().toLowerCase(),
      reason: reason.trim(),
      created_by: actor.user._id,
      created_at: new Date(),
    });
    await this.audit.record(actor.user._id, 'destination.blocked', 'blocked_destination', pattern);
  }
  async quarantine(actor: Actor, linkId: ObjectId) {
    this.authorization.requirePlatformAdmin(actor);
    const link = await this.links.findById(linkId);
    if (!link) throw errors.notFound();
    link.state = 'quarantined';
    link.updated_at = new Date();
    await this.links.update(link);
    await this.audit.record(actor.user._id, 'link.quarantined', 'link', linkId.toHexString(), link.workspace_id);
    return link;
  }
  async updateAbuse(actor: Actor, reportId: ObjectId, status: 'open' | 'reviewing' | 'resolved' | 'dismissed') {
    this.authorization.requirePlatformAdmin(actor);
    const report = await this.admin.findAbuse(reportId);
    if (!report) throw errors.notFound();
    report.status = status;
    report.updated_at = new Date();
    await this.admin.updateAbuse(report);
    await this.audit.record(actor.user._id, 'abuse_report.updated', 'abuse_report', reportId.toHexString());
  }
}
