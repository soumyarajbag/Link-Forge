import type { ObjectId } from 'mongodb';
import type { ApiKeyDocument } from './api-key.model.js';
import type { SessionDocument } from './session.model.js';
import type { UserDocument } from './user.model.js';

export type Actor = {
  user: UserDocument;
  session?: SessionDocument;
  apiKey?: ApiKeyDocument;
  workspaceId?: ObjectId;
  authMethod: 'cookie' | 'api_key';
};
