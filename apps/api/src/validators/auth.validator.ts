import { z } from 'zod';
import { email, password } from './common.validator.js';

export const registerSchema = z.object({
  email,
  password,
  display_name: z.string().trim().max(80).optional(),
  device_label: z.string().trim().max(120).optional(),
  invitation_token: z.string().min(32).max(512).optional(),
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(256), device_label: z.string().trim().max(120).optional() });
export const tokenSchema = z.object({ token: z.string().min(1).max(512) });
export const verifyEmailSchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, 'verification code must be exactly 6 digits'),
  invitation_token: z.string().min(32).max(512).optional(),
});
export const resetRequestSchema = z.object({ email });
export const resetConfirmSchema = z.object({ token: z.string().min(1).max(512), password });
