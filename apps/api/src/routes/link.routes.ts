import { Router } from 'express';
import { LinkController } from '../controllers/link.controller.js';

export function linkRoutes(controller: LinkController): Router {
  const router = Router();
  router.get('/workspaces/:workspaceID/links', controller.list);
  router.post('/workspaces/:workspaceID/links', controller.create);
  router.get('/links/:linkID', controller.get);
  router.patch('/links/:linkID', controller.update);
  router.delete('/links/:linkID', controller.remove);
  router.post('/links/:linkID/pause', controller.pause);
  router.post('/links/:linkID/restore', controller.restore);
  router.get('/links/:linkID/analytics', controller.analytics);
  router.get('/links/:linkID/qr', controller.qr);
  router.post('/links/:linkID/abuse-reports', controller.abuse);
  return router;
}
export function redirectRoutes(controller: LinkController): Router {
  const router = Router();
  router.get('/:slug', controller.redirect);
  router.head('/:slug', controller.redirect);
  return router;
}
