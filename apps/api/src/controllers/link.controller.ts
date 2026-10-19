import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import { asyncHandler, parseBody, parseId, sendData, sendMessage, stringParam } from '../utils/http.js';
import type { AppConfig } from '../config/env.js';
import { dateRange } from '../utils/url.js';
import { listOptions } from '../utils/pagination.js';
import { abuseSchema, createLinkSchema, updateLinkSchema } from '../validators/link.validator.js';
import { LinkService } from '../services/link.service.js';

export class LinkController {
  constructor(
    private readonly service: LinkService,
    private readonly config: AppConfig,
  ) {}
  list = asyncHandler(async (request, response) => {
    const result = await this.service.list(request.actor!, parseId(stringParam(request.params.workspaceID)), listOptions(request));
    sendData(request, response, 200, {
      links: result.items,
      pagination: { page: listOptions(request).page, page_size: listOptions(request).pageSize, total: result.total },
    });
  });
  create = asyncHandler(async (request, response) => {
    const input = parseBody(createLinkSchema, request.body);
    const link = await this.service.create(request.actor!, {
      workspaceId: parseId(stringParam(request.params.workspaceID)),
      domainId: input.domain_id ? parseId(input.domain_id) : undefined,
      destinationUrl: input.destination_url,
      slug: input.slug,
      redirectStatus: input.redirect_status,
      title: input.title,
      description: input.description,
      tags: input.tags,
      folder: input.folder,
      campaign: input.campaign,
      expiresAt: input.expires_at,
      maxClicks: input.max_clicks,
      password: input.password,
      routingRules: input.routing_rules,
      qr: input.qr,
    });
    sendData(request, response, 201, { link, short_url: this.shortUrl(link.slug) });
  });
  get = asyncHandler(async (request, response) => {
    const link = await this.service.get(request.actor!, parseId(stringParam(request.params.linkID)));
    sendData(request, response, 200, { link, short_url: this.shortUrl(link.slug) });
  });
  update = asyncHandler(async (request, response) => {
    const input = parseBody(updateLinkSchema, request.body);
    const link = await this.service.update(request.actor!, parseId(stringParam(request.params.linkID)), input);
    sendData(request, response, 200, { link, short_url: this.shortUrl(link.slug) });
  });
  remove = asyncHandler(async (request, response) => {
    await this.service.delete(request.actor!, parseId(stringParam(request.params.linkID)));
    sendMessage(request, response, 200, 'link deleted');
  });
  pause = asyncHandler(async (request, response) =>
    sendData(request, response, 200, {
      link: await this.service.setState(request.actor!, parseId(stringParam(request.params.linkID)), 'paused'),
    }),
  );
  restore = asyncHandler(async (request, response) =>
    sendData(request, response, 200, {
      link: await this.service.setState(request.actor!, parseId(stringParam(request.params.linkID)), 'active'),
    }),
  );
  analytics = asyncHandler(async (request, response) => {
    const range = dateRange(stringParam(request.query.from), stringParam(request.query.to));
    sendData(
      request,
      response,
      200,
      await this.service.analyticsFor(request.actor!, parseId(stringParam(request.params.linkID)), range.from, range.to),
    );
  });
  qr = asyncHandler(async (request, response) => {
    const link = await this.service.get(request.actor!, parseId(stringParam(request.params.linkID)));
    const size = Math.min(2048, Math.max(64, link.qr.size));
    response.type('png').send(await QRCode.toBuffer(this.shortUrl(link.slug), { type: 'png', width: size, errorCorrectionLevel: 'M' }));
  });
  abuse = asyncHandler(async (request, response) => {
    const input = parseBody(abuseSchema, request.body);
    await this.service.report(parseId(stringParam(request.params.linkID)), input.reason, input.details || '');
    sendMessage(request, response, 202, 'report received');
  });
  redirect = asyncHandler(async (request, response) => {
    const result = await this.service.resolve(request.get('host') || this.config.defaultShortDomain, stringParam(request.params.slug), {
      password: stringParam(request.query.password),
      country: request.get('x-country-code') || '',
      deviceClass: this.deviceClass(request.get('user-agent') || ''),
      os: request.get('x-os') || '',
      language: request.get('accept-language') || '',
      referrer: request.get('referer') || '',
      ip: request.ip || '',
    });
    response.redirect(result.status, result.destination);
  });
  private shortUrl(slug: string) {
    return `${this.config.shortBaseUrl.replace(/\/$/, '')}/${slug}`;
  }
  private deviceClass(userAgent: string) {
    const ua = userAgent.toLowerCase();
    if (/bot|crawler|spider/.test(ua)) return 'bot';
    if (/mobile|android|iphone/.test(ua)) return 'mobile';
    return 'desktop';
  }
}
