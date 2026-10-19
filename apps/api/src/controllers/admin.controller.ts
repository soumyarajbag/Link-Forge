import { asyncHandler, parseBody, parseId, sendData, sendMessage, stringParam } from '../utils/http.js';
import { listOptions } from '../utils/pagination.js';
import { abuseUpdateSchema, blockSchema } from '../validators/admin.validator.js';
import { AdminService } from '../services/admin.service.js';
import type { AuthRepository } from '../repositories/auth.repository.js';

export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly users: AuthRepository,
  ) {}
  overview = asyncHandler(async (request, response) => sendData(request, response, 200, await this.service.overview(request.actor!)));
  usersList = asyncHandler(async (request, response) => {
    const result = await this.service.users(request.actor!, listOptions(request), (options) => this.users.listUsers(options));
    sendData(request, response, 200, { users: result.items, total: result.total });
  });
  workspaces = asyncHandler(async (request, response) => {
    const result = await this.service.workspaces(request.actor!, listOptions(request));
    sendData(request, response, 200, { workspaces: result.items, total: result.total });
  });
  links = asyncHandler(async (request, response) => {
    const result = await this.service.linksList(request.actor!, listOptions(request));
    sendData(request, response, 200, { links: result.items, total: result.total });
  });
  auditLogs = asyncHandler(async (request, response) => {
    const result = await this.service.auditLogs(request.actor!, listOptions(request));
    sendData(request, response, 200, { audit_logs: result.items, total: result.total });
  });
  abuseReports = asyncHandler(async (request, response) => {
    const result = await this.service.abuseReports(request.actor!, listOptions(request));
    sendData(request, response, 200, { reports: result.items, total: result.total });
  });
  updateAbuse = asyncHandler(async (request, response) => {
    const input = parseBody(abuseUpdateSchema, request.body);
    await this.service.updateAbuse(request.actor!, parseId(stringParam(request.params.reportID)), input.status);
    sendMessage(request, response, 200, 'abuse report updated');
  });
  blocked = asyncHandler(async (request, response) =>
    sendData(request, response, 200, { blocked_destinations: await this.service.blocked(request.actor!) }),
  );
  block = asyncHandler(async (request, response) => {
    const input = parseBody(blockSchema, request.body);
    await this.service.block(request.actor!, input.pattern, input.reason || '');
    sendMessage(request, response, 201, 'destination blocked');
  });
  quarantine = asyncHandler(async (request, response) =>
    sendData(request, response, 200, { link: await this.service.quarantine(request.actor!, parseId(stringParam(request.params.linkID))) }),
  );
}
