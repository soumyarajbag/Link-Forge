import { Router } from 'express';
import { ApiKeyController } from '../controllers/api-key.controller.js';

export function apiKeyRoutes(controller: ApiKeyController): Router {
  const router = Router();
  router.get('/workspaces/:workspaceID/api-keys', controller.list);
  router.post('/workspaces/:workspaceID/api-keys', controller.create);
  router.delete('/workspaces/:workspaceID/api-keys/:keyID', controller.revoke);
  return router;
}
