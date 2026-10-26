import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (request, response, next) => {
  const supplied = request.get('x-request-id');
  request.requestId = supplied && /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied) ? supplied : randomUUID();
  response.set('x-request-id', request.requestId);
  next();
};
