import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (request, response, next) => {
  const supplied = request.get('x-request-id');
  request.requestId = supplied && supplied.length <= 100 ? supplied : randomUUID();
  response.set('x-request-id', request.requestId);
  const startedAt = performance.now();
  response.on('finish', () =>
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'http request',
        request_id: request.requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        duration_ms: Math.round(performance.now() - startedAt),
      }),
    ),
  );
  next();
};
