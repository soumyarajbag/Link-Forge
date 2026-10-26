import { z } from 'zod';
import { destinationUrl, optionalDate, tags } from './common.validator.js';

const qrSchema = z
  .object({
    foreground: z
      .string()
      .regex(/^#[\da-f]{6}$/i)
      .optional(),
    background: z
      .string()
      .regex(/^#[\da-f]{6}$/i)
      .optional(),
    size: z.number().int().min(64).max(2048).optional(),
  })
  .optional();
const ruleSchema = z.object({
  id: z.string().optional(),
  priority: z.number().int().positive().optional(),
  country_codes: z.array(z.string()).optional(),
  device_classes: z.array(z.string()).optional(),
  os_names: z.array(z.string()).optional(),
  language_codes: z.array(z.string()).optional(),
  destination: destinationUrl,
  enabled: z.boolean().optional(),
});
export const createLinkSchema = z.object({
  destination_url: destinationUrl,
  slug: z.string().trim().max(50).optional(),
  redirect_status: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  tags,
  folder: z.string().trim().max(120).optional(),
  campaign: z.string().trim().max(120).optional(),
  expires_at: optionalDate,
  max_clicks: z.number().int().min(0).optional(),
  password: z.string().min(8).max(128).optional(),
  routing_rules: z.array(ruleSchema).max(50).optional(),
  qr: qrSchema,
});
export const updateLinkSchema = createLinkSchema
  .partial()
  .extend({ state: z.enum(['active', 'paused', 'quarantined']).optional(), password: z.string().min(8).max(128).nullable().optional() });
export const abuseSchema = z.object({ reason: z.string().trim().min(3).max(120), details: z.string().trim().max(4000).optional() });
