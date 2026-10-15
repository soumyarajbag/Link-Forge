import { z } from 'zod';
export const blockSchema = z.object({ pattern: z.string().trim().min(1).max(4096), reason: z.string().trim().max(500).optional() });
export const abuseUpdateSchema = z.object({ status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']) });
