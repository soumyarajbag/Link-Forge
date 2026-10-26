import express, { Router, type RequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { stringify as stringifyYaml } from 'yaml';
import type { AppContainer } from './container.js';
import { asyncHandler } from './utils/http.js';
import { requireAuthentication } from './middleware/auth.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { requestContext } from './middleware/request-context.middleware.js';
import { adminRoutes } from './routes/admin.routes.js';
import { apiKeyRoutes } from './routes/api-key.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { linkRoutes, redirectRoutes } from './routes/link.routes.js';
import { domainRoutes, workspaceRoutes } from './routes/workspace.routes.js';
import { invitationRoutes, workspaceInvitationRoutes } from './routes/invitation.routes.js';
import { openapiDocument } from './config/swagger.js';

export function createApp(container: AppContainer) {
  const app = express();
  const { config, database, controllers, repositories, services } = container;
  // Trust only the first reverse proxy hop (Vercel/load balancer), never an
  // arbitrary client-supplied chain. This keeps request.ip and rate limiting aligned.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestContext);
  app.use(helmet());
  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitRequests,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (request) => request.path === '/health',
    }),
  );

  app.get('/', (_request, response) => {
    response.status(200).json({
      service: 'linkforge-api',
      status: 'ok',
      docs: '/docs',
      health: '/health',
      version: '0.2.0',
    });
  });

  app.get(
    '/health',
    asyncHandler(async (request, response) => {
      await database.db.command({ ping: 1 });
      response.status(200).json({ data: { status: 'ok', service: 'linkforge-api' }, request_id: request.requestId });
    }),
  );
  app.get('/openapi.json', (_request, response) => response.json(openapiDocument));
  app.get('/openapi.yaml', (_request, response) => response.type('text/yaml').send(stringifyYaml(openapiDocument)));
  const docsCspBypass: RequestHandler = (_request, response, next) => {
    response.removeHeader('Content-Security-Policy');
    next();
  };
  app.use('/docs', docsCspBypass, swaggerUi.serve, swaggerUi.setup(openapiDocument, { explorer: true, customSiteTitle: 'LinkForge API' }));

  const authenticatedAuth = Router();
  app.use('/v1/auth', authRoutes(controllers.auth, authenticatedAuth));

  // Abuse reports are deliberately public so visitors can report a malicious destination.
  app.post('/v1/links/:linkID/abuse-reports', controllers.link.abuse);
  app.get('/v1/invitations/:token', controllers.invitation.publicDetails);

  app.use('/v1', requireAuthentication(services.authService, repositories.apiKeyRepository, repositories.authRepository));
  app.use('/v1', csrfProtection);
  app.use('/v1/auth', authenticatedAuth);
  app.use('/v1/workspaces', workspaceRoutes(controllers.workspace));
  app.use('/v1/workspaces', workspaceInvitationRoutes(controllers.invitation));
  app.use('/v1/invitations', invitationRoutes(controllers.invitation));
  app.use('/v1/domains', domainRoutes(controllers.workspace));
  app.use('/v1', linkRoutes(controllers.link));
  app.use('/v1', apiKeyRoutes(controllers.apiKey));
  app.use('/v1/admin', adminRoutes(controllers.admin));

  // Redirect routes are intentionally mounted after all API routes.
  app.use('/r', redirectRoutes(controllers.link));
  app.use('/', redirectRoutes(controllers.link));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
