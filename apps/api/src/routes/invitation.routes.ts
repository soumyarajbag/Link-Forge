import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.controller.js';

export function workspaceInvitationRoutes(controller: InvitationController): Router {
  const router = Router();
  router.get('/:workspaceID/invitations', controller.list);
  router.post('/:workspaceID/invitations', controller.create);
  router.delete('/:workspaceID/invitations/:invitationID', controller.revoke);
  return router;
}
export function invitationRoutes(controller: InvitationController): Router {
  const router = Router();
  router.post('/accept', controller.accept);
  return router;
}
