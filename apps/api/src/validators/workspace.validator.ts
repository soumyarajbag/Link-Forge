import { z } from 'zod';
import { email, objectId } from './common.validator.js';

export const workspaceSchema = z.object({ name: z.string().trim().min(1).max(80) });
export const memberSchema = z.object({
  email: email.optional(),
  role: z.enum(['owner', 'admin', 'editor', 'analyst', 'viewer']),
  permissions: z.array(z.string().trim().max(80)).max(50).optional(),
});
export const invitationSchema = z.object({ email, role: z.enum(['admin', 'editor', 'analyst', 'viewer']) });
export const invitationTokenSchema = z.object({ token: z.string().min(32).max(512) });
export const workspaceIdSchema = z.object({ workspaceID: objectId });
