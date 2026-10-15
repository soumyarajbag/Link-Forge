import type { BaseDocument } from './base.model.js';
import type { WorkspaceRole } from './member.model.js';
import type { ObjectId } from 'mongodb';

export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export type WorkspaceInvitationDocument = BaseDocument & {
  workspace_id: ObjectId;
  email: string;
  role: WorkspaceRole;
  token_hash: string;
  status: WorkspaceInvitationStatus;
  invited_by: ObjectId;
  accepted_by?: ObjectId;
  accepted_at?: Date;
  expires_at: Date;
};
