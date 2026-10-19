import { asyncHandler, parseBody, parseId, sendData, sendMessage, stringParam } from '../utils/http.js';
import { optionalDate } from '../validators/common.validator.js';
import { apiKeySchema } from '../validators/api-key.validator.js';
import { ApiKeyService } from '../services/api-key.service.js';

export class ApiKeyController {
  constructor(private readonly service: ApiKeyService) {}
  list = asyncHandler(async (request, response) =>
    sendData(request, response, 200, {
      api_keys: await this.service.list(request.actor!, parseId(stringParam(request.params.workspaceID))),
    }),
  );
  create = asyncHandler(async (request, response) => {
    const input = parseBody(apiKeySchema, request.body);
    const result = await this.service.create(
      request.actor!,
      parseId(stringParam(request.params.workspaceID)),
      input.name,
      input.scopes || [],
      input.expires_at,
    );
    sendData(request, response, 201, {
      api_key: result.key,
      secret: result.secret,
      warning: 'store this secret now; it will not be returned again',
    });
  });
  revoke = asyncHandler(async (request, response) => {
    await this.service.revoke(request.actor!, parseId(stringParam(request.params.workspaceID)), parseId(stringParam(request.params.keyID)));
    sendMessage(request, response, 200, 'API key revoked');
  });
}
