import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { AppError, errors } from './app-error.js';
import { serialize } from './dto.js';

export type Controller = (request: Request, response: Response, next: NextFunction) => Promise<void>;
export function asyncHandler(controller: Controller): RequestHandler {
  return (request, response, next) => controller(request, response, next).catch(next);
}
export function sendData(request: Request, response: Response, status: number, data: unknown): void {
  response.status(status).json({ data: serialize(data), request_id: request.requestId });
}
export function sendMessage(request: Request, response: Response, status: number, message: string): void {
  sendData(request, response, status, { message });
}
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw errors.validation('validation failed', parsed.error.flatten());
  return parsed.data;
}
export function parseId(value: string): ObjectId {
  if (!/^[a-f\d]{24}$/i.test(value)) throw errors.validation('invalid identifier');
  return new ObjectId(value);
}
export function stringParam(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return '';
}
export function requestId(request: Request): string {
  return request.requestId || 'unknown';
}
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
