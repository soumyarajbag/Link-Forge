import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';

export function adminRoutes(controller: AdminController): Router {
  const router = Router();
  router.get('/overview', controller.overview);
  router.get('/users', controller.usersList);
  router.get('/workspaces', controller.workspaces);
  router.get('/links', controller.links);
  router.get('/audit-logs', controller.auditLogs);
  router.get('/abuse-reports', controller.abuseReports);
  router.patch('/abuse-reports/:reportID', controller.updateAbuse);
  router.get('/blocked-destinations', controller.blocked);
  router.post('/blocked-destinations', controller.block);
  router.post('/links/:linkID/quarantine', controller.quarantine);
  return router;
}
