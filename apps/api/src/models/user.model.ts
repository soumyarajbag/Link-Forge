import type { BaseDocument } from './base.model.js';

export type UserStatus = 'active' | 'pending' | 'suspended' | 'deleted';

export type UserDocument = BaseDocument & {
  email: string;
  password_hash: string;
  display_name: string;
  status: UserStatus;
  email_verified_at?: Date;
  email_verification_hash?: string;
  email_verification_expires_at?: Date;
  email_verification_attempts?: number;
  email_verification_sent_at?: Date;
  password_reset_hash?: string;
  password_reset_expires_at?: Date;
  is_platform_admin: boolean;
  deleted_at?: Date;
};
