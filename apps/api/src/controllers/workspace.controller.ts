import type { Request, Response } from 'express';
import { asyncHandler, parseBody, parseId, sendData, sendMessage, stringParam } from '../utils/http.js';
import { listOptions } from '../utils/pagination.js';
import { domainSchema, memberSchema, verifyDomainSchema, workspaceSchema } from '../validators/workspace.validator.js';
import { WorkspaceService } from '../services/workspace.service.js';

export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}
  list = asyncHandler(async (request, response) =>
    sendData(request, response, 200, { workspaces: await this.service.list(request.actor!.user._id) }),
  );
  create = asyncHandler(async (request, response) =>
    sendData(request, response, 201, {
      workspace: await this.service.create(request.actor!.user._id, parseBody(workspaceSchema, request.body).name),
    }),
  );
  get = asyncHandler(async (request, response) => {
    const result = await this.service.get(request.actor!, parseId(stringParam(request.params.workspaceID)));
    sendData(request, response, 200, { workspace: result.workspace, membership: result.member });
  });
  update = asyncHandler(async (request, response) => {
    const input = parseBody(workspaceSchema, request.body);
    sendData(request, response, 200, {
      workspace: await this.service.update(request.actor!, parseId(stringParam(request.params.workspaceID)), input.name),
    });
  });
  members = asyncHandler(async (request, response) =>
    sendData(request, response, 200, {
      members: await this.service.listMembers(request.actor!, parseId(stringParam(request.params.workspaceID))),
    }),
  );
  addMember = asyncHandler(async (request, response) => {
    const input = parseBody(memberSchema.required({ email: true }), request.body);
    sendData(request, response, 201, {
      member: await this.service.addMember(request.actor!, parseId(stringParam(request.params.workspaceID)), input.email, input.role),
    });
  });
  updateMember = asyncHandler(async (request, response) => {
    const input = parseBody(memberSchema, request.body);
    sendData(request, response, 200, {
      member: await this.service.updateMember(
        request.actor!,
        parseId(stringParam(request.params.workspaceID)),
        parseId(stringParam(request.params.userID)),
        input.role,
        input.permissions || [],
      ),
    });
  });
  removeMember = asyncHandler(async (request, response) => {
    await this.service.removeMember(
      request.actor!,
      parseId(stringParam(request.params.workspaceID)),
      parseId(stringParam(request.params.userID)),
    );
    sendMessage(request, response, 200, 'member removed');
  });
  domains = asyncHandler(async (request, response) =>
    sendData(request, response, 200, {
      domains: await this.service.listDomains(request.actor!, parseId(stringParam(request.params.workspaceID))),
    }),
  );
  createDomain = asyncHandler(async (request, response) => {
    const workspaceId = parseId(stringParam(request.params.workspaceID));
    const result = await this.service.createDomain(request.actor!, workspaceId, parseBody(domainSchema, request.body).hostname);
    const verification = this.serviceVerification(result.domain.hostname, result.token);
    sendData(request, response, 201, { domain: result.domain, verification });
  });
  verifyDomain = asyncHandler(async (request, response) => {
    const input = parseBody(verifyDomainSchema, request.body);
    sendData(request, response, 200, {
      domain: await this.service.verifyDomain(request.actor!, parseId(stringParam(request.params.domainID)), input.token),
    });
  });
  deleteDomain = asyncHandler(async (request, response) => {
    await this.service.deleteDomain(request.actor!, parseId(stringParam(request.params.domainID)));
    sendMessage(request, response, 200, 'domain deleted');
  });
  private serviceVerification(hostname: string, token: string) {
    return { type: 'dns_txt', hostname: `_linkforge.${hostname}`, value: token };
  }
}
