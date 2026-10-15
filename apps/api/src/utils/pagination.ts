import type { Request } from 'express';
import type { ListOptions } from '../models/list-options.model.js';
import { stringParam } from './http.js';

export function pageValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10_000 ? parsed : fallback;
}
export function listOptions(request: Request): ListOptions {
  return {
    page: pageValue(stringParam(request.query.page), 1),
    pageSize: Math.min(100, pageValue(stringParam(request.query.page_size), 20)),
    search: stringParam(request.query.search).trim(),
    state: stringParam(request.query.state).trim(),
  };
}
