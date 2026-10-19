import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller.js';

export function workspaceRoutes(controller: WorkspaceController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:workspaceID', controller.get);
  router.patch('/:workspaceID', controller.update);
  router.get('/:workspaceID/members', controller.members);
  router.post('/:workspaceID/members', controller.addMember);
  router.patch('/:workspaceID/members/:userID', controller.updateMember);
  router.delete('/:workspaceID/members/:userID', controller.removeMember);
  router.get('/:workspaceID/domains', controller.domains);
  router.post('/:workspaceID/domains', controller.createDomain);
  return router;
}
export function domainRoutes(controller: WorkspaceController): Router {
  const router = Router();
  router.post('/:domainID/verify', controller.verifyDomain);
  router.delete('/:domainID', controller.deleteDomain);
  return router;
}
