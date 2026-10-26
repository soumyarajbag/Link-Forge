# LinkForge API

Express 5 + TypeScript + MongoDB backend for LinkForge. The service is a
modular monolith: HTTP adapters are separated from application services,
repository contracts, and MongoDB implementations.

## Run locally

Start MongoDB with Docker:

```powershell
docker compose up -d mongo
Copy-Item .env.example .env
npm install
npm run dev
```

The API listens on `http://localhost:8080` by default. Check it with:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

### Request logging

Development uses a readable, colorized request log. Each completed request
shows its method, sanitized URL, status, duration, payload sizes, request ID,
authentication method, actor/workspace identifiers, client IP, and user agent.
Sensitive query values and invitation tokens are redacted; request bodies,
cookies, authorization headers, and API-key secrets are never logged.

```env
LOG_FORMAT=pretty
```

Use `LOG_FORMAT=json` for structured production logs. When the variable is
omitted, development defaults to `pretty` and production defaults to `json`.

Registration creates a pending account and sends a six-digit email OTP. Verify
it with `POST /v1/auth/verify-email` before the browser session is issued. A
workspace admin can invite any email address; the recipient can register or
sign in from the emailed `/accept-invitation?token=...` link, and the invite is
accepted after authentication (or immediately after OTP verification).
`POST /v1/auth/verify-email/resend` issues a replacement code after the resend
cooldown. For local development, leave SMTP blank and
`EXPOSE_DEV_TOKENS=true`: the API logs the OTP and includes it in the response.
Production always forces `EXPOSE_DEV_TOKENS` off, even if a stale deployment
variable says otherwise. Set it to `false` outside local development for
configuration clarity, and configure SMTP before enabling registration.
Production also forces secure cookies with `SameSite=None`, which is required
when the frontend and API use separate HTTPS origins. Local HTTP development
keeps `COOKIE_SECURE=false` and `SameSite=Lax`.

For example, a Gmail SMTP setup uses a Google app password rather than the
normal account password:

```env
EMAIL_FROM=LinkForge <no-reply@your-domain.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_SECURE=false
```

## Architecture

```text
src/
  index.ts               thin Vercel function adapter
  express-app.ts         Express middleware and route composition
  local-server.ts        local process lifecycle and graceful shutdown
  container.ts           dependency injection composition root
  config/                environment, MongoDB connection/indexes, Swagger
  controllers/           HTTP parsing and response mapping
  routes/                URL and middleware composition
  services/              business rules and authorization workflows
  validators/            reusable Zod request constraints
  middleware/            request ID, authentication, CSRF, error mapping
  models/                one document model per persisted entity plus collection names
  repositories/          repository contracts and Mongo implementations
  utils/                 app errors, HTTP helpers, hashing, cookies, DTOs, pagination, URLs
```

Controllers parse and serialize HTTP. Services own business rules and
authorization. Repository interfaces keep services independent of MongoDB;
the concrete repositories are wired only in `src/container.ts`.

## Important routes

- `GET /health`, `GET /docs` (Swagger UI), `GET /openapi.json`, `GET /openapi.yaml`
- `POST /v1/auth/register`, `POST /v1/auth/verify-email`, `POST /v1/auth/verify-email/resend`, `POST /v1/auth/login`
- `POST /v1/auth/password-reset/request`, `POST /v1/auth/password-reset/confirm`
- `GET|POST /v1/workspaces`
- `GET|PATCH /v1/workspaces/:workspaceID`, `GET|POST /v1/workspaces/:workspaceID/members`
- `GET|POST /v1/workspaces/:workspaceID/invitations`, `DELETE /v1/workspaces/:workspaceID/invitations/:invitationID`
- `GET /v1/invitations/:token`, `POST /v1/invitations/accept`
- `PATCH|DELETE /v1/workspaces/:workspaceID/members/:userID`
- `GET|POST /v1/workspaces/:workspaceID/links`
- `GET|PATCH|DELETE /v1/links/:linkID`
- `GET /v1/links/:linkID/analytics`
- `GET|POST /v1/workspaces/:workspaceID/api-keys`, `DELETE /v1/workspaces/:workspaceID/api-keys/:keyID`
- `GET /v1/admin/overview`, `GET /v1/admin/users`, `GET /v1/admin/workspaces`, `GET /v1/admin/links`
- `GET /v1/admin/audit-logs`, `GET|PATCH /v1/admin/abuse-reports`, `GET|POST /v1/admin/blocked-destinations`
- `POST /v1/admin/links/:linkID/quarantine`
- `GET /r/:slug` and `GET /:slug` for redirects

Cookie sessions are the browser authentication mechanism. API keys can be sent
with `X-API-Key` or `Authorization: Bearer ...`. Mutating cookie-authenticated
requests require the CSRF token returned by `GET /v1/auth/csrf`.

## Quality checks

```powershell
npm run typecheck
npm run build
npm test
npm run format:check
npm audit --omit=dev
```

The Vercel entry point is `src/index.ts`; it caches the MongoDB/app
initialization promise across warm invocations. The local server uses the same
composition root and closes MongoDB cleanly on `SIGINT`/`SIGTERM`.
