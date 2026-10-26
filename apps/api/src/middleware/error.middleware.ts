import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError('not_found', 'not found', 404));
};
export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (response.headersSent) return;
  const appError =
    error instanceof AppError
      ? error
      : error?.type === 'entity.parse.failed'
        ? new AppError('invalid_json', 'request body is invalid', 400)
        : undefined;
  const status = appError?.status || 500;
  const code = appError?.code || 'internal_error';
  const message = appError?.message || 'an unexpected error occurred';
  response.locals.errorCode = code;
  if (!appError)
    console.error(
      JSON.stringify({ level: 'error', request_id: request.requestId, error: error instanceof Error ? error.message : String(error) }),
    );
  response.status(status).json({ error: { code, message, request_id: request.requestId } });
};
