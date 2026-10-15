import { z } from 'zod';
import { optionalDate } from './common.validator.js';

export const apiKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.string().trim().max(80)).max(30).optional(),
  expires_at: optionalDate,
});
