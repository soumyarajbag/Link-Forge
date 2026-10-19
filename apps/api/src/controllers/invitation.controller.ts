import { asyncHandler, parseBody, parseId, sendData, sendMessage, stringParam } from '../utils/http.js';
import type { AppConfig } from '../config/env.js';
import { invitationSchema, invitationTokenSchema } from '../validators/workspace.validator.js';
import { InvitationService } from '../services/invitation.service.js';

export class InvitationController {
  constructor(
    private readonly service: InvitationService,
    private readonly config: AppConfig,
  ) {}

  list = asyncHandler(async (request, response) =>
    sendData(request, response, 200, {
      invitations: await this.service.list(request.actor!, parseId(stringParam(request.params.workspaceID))),
    }),
  );
  create = asyncHandler(async (request, response) => {
    const input = parseBody(invitationSchema, request.body);
    const result = await this.service.create(request.actor!, parseId(stringParam(request.params.workspaceID)), input.email, input.role);
    const data: Record<string, unknown> = { invitation: result.invitation };
    if (this.config.exposeDevTokens) data.development_invitation_token = result.token;
    sendData(request, response, 201, data);
  });
  revoke = asyncHandler(async (request, response) => {
    await this.service.revoke(
      request.actor!,
      parseId(stringParam(request.params.workspaceID)),
      parseId(stringParam(request.params.invitationID)),
    );
    sendMessage(request, response, 200, 'invitation revoked');
  });
  publicDetails = asyncHandler(async (request, response) =>
    sendData(request, response, 200, await this.service.publicDetails(stringParam(request.params.token))),
  );
  accept = asyncHandler(async (request, response) => {
    const input = parseBody(invitationTokenSchema, request.body);
    sendData(request, response, 200, { workspace: await this.service.accept(request.actor!, input.token) });
  });
}
