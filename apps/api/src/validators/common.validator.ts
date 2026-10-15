import { z } from 'zod';

export const email = z.string().trim().email().max(320);
export const password = z.string().min(12).max(256);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'invalid identifier');
export const destinationUrl = z
  .string()
  .trim()
  .min(1)
  .max(4096)
  .url()
  .refine((value) => /^https?:\/\//i.test(value) && !/[\u0000-\u001f\u007f]/.test(value), 'destination must use http or https');
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  state: z.string().trim().optional(),
});
export const optionalDate = z
  .string()
  .datetime()
  .optional()
  .transform((value) => (value ? new Date(value) : undefined));
export const tags = z.array(z.string().trim().max(64)).max(100).optional();
