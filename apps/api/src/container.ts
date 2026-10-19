import type { AppConfig } from './config/env.js';
import { MongoDatabase } from './config/database.js';
import { MongoAdminRepository } from './repositories/admin.repository.js';
import { MongoAnalyticsRepository } from './repositories/analytics.repository.js';
import { MongoApiKeyRepository } from './repositories/api-key.repository.js';
import { MongoAuthRepository } from './repositories/auth.repository.js';
import { MongoLinkRepository } from './repositories/link.repository.js';
import { MongoWorkspaceRepository } from './repositories/workspace.repository.js';
import { AuthorizationService } from './services/authorization.service.js';
import { AuditService } from './services/audit.service.js';
import { EmailService } from './services/email.service.js';
import { AdminController } from './controllers/admin.controller.js';
import { AdminService } from './services/admin.service.js';
import { ApiKeyController } from './controllers/api-key.controller.js';
import { ApiKeyService } from './services/api-key.service.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { LinkController } from './controllers/link.controller.js';
import { LinkService } from './services/link.service.js';
import { WorkspaceController } from './controllers/workspace.controller.js';
import { InvitationController } from './controllers/invitation.controller.js';
import { InvitationService } from './services/invitation.service.js';
import { WorkspaceService } from './services/workspace.service.js';

export function createContainer(config: AppConfig, database: MongoDatabase) {
  const authRepository = new MongoAuthRepository(database);
  const workspaceRepository = new MongoWorkspaceRepository(database);
  const linkRepository = new MongoLinkRepository(database);
  const analyticsRepository = new MongoAnalyticsRepository(database);
  const apiKeyRepository = new MongoApiKeyRepository(database);
  const adminRepository = new MongoAdminRepository(database);

  const authorization = new AuthorizationService(workspaceRepository);
  const audit = new AuditService(adminRepository);
  const email = new EmailService(config);
  const invitationService = new InvitationService(workspaceRepository, authRepository, authorization, audit, email);
  const authService = new AuthService(authRepository, workspaceRepository, email, invitationService, config);
  const workspaceService = new WorkspaceService(workspaceRepository, authRepository, authorization, audit);
  const linkService = new LinkService(
    linkRepository,
    workspaceRepository,
    analyticsRepository,
    adminRepository,
    authorization,
    audit,
    config,
  );
  const apiKeyService = new ApiKeyService(apiKeyRepository, authorization, audit);
  const adminService = new AdminService(adminRepository, linkRepository, authorization, audit);

  return {
    config,
    database,
    repositories: { authRepository, workspaceRepository, linkRepository, analyticsRepository, apiKeyRepository, adminRepository },
    services: { authService, invitationService, workspaceService, linkService, apiKeyService, adminService, authorization, audit, email },
    controllers: {
      auth: new AuthController(authService, authRepository, config),
      invitation: new InvitationController(invitationService, config),
      workspace: new WorkspaceController(workspaceService),
      link: new LinkController(linkService, config),
      apiKey: new ApiKeyController(apiKeyService),
      admin: new AdminController(adminService, authRepository),
    },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
