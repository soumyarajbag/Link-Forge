# LinkForge — Technical Requirements Document

**Status:** Implementation baseline  
**Version:** 0.2  
**Date:** 2026-10-25  
**Companion document:** [PRD.md](PRD.md)

## 1. Technical summary

LinkForge will be a monorepo with two independently deployable applications:

- `apps/web`: Next.js App Router frontend deployed to a Vercel project.
- `apps/api`: Express/TypeScript HTTP API and redirect service deployed to a second Vercel project using Vercel’s Node.js Functions runtime.

MongoDB Atlas is the shared source of truth. The frontend never connects directly to MongoDB. All authorization and business rules are enforced by the Express backend.

The redirect service is a first-class backend path, not a Next.js page. This keeps link resolution, analytics capture, and dashboard rendering independently scalable and testable.

## 2. Architecture decision

### 2.1 Recommended deployment topology

```text
                         ┌────────────────────────┐
                         │  app.example.com        │
                         │  Next.js / Vercel       │
                         └───────────┬────────────┘
                                     │ same-origin /api rewrite
                         ┌───────────▼────────────┐
                         │  api.example.com        │
                         │ Node.js / Vercel Functions│
                         │  REST + auth + admin    │
                         └───────┬─────────┬──────┘
                                 │         │
                ┌────────────────▼─┐   ┌───▼────────────────┐
                │ lnk.example.com  │   │ MongoDB Atlas       │
                │ branded redirects│   │ links + events      │
                └──────────────────┘   └────────────────────┘
```

Recommended production hostnames:

- `app.example.com` — dashboard, marketing pages, and browser-facing `/api` rewrite.
- `api.example.com` — direct API hostname for API keys, integrations, and operational checks.
- `lnk.example.com` — primary short-link hostname.

The web project will rewrite `/api/:path*` to the API project without changing the browser URL. This keeps browser authentication same-origin from the frontend’s perspective while retaining a separately deployable Express service. Vercel documents external rewrites as a reverse-proxy pattern, but the exact cookie and path behavior must be covered by a deployment smoke test.

### 2.2 Why two Vercel projects

- Independent frontend and backend deployment history.
- The Node.js runtime can be configured and rolled back separately from Next.js.
- Redirect traffic cannot accidentally share a Next.js page bundle.
- API, redirect, and cron function settings can be tuned separately.
- A later move of the Express service to Cloud Run, Fly.io, or another server platform does not require moving the frontend.

Vercel Services can combine multiple runtimes in one project, so a single-project layout remains a possible optimization. The two-project topology is easier to reason about and migrate.

## 3. Technology stack

### Frontend

- Next.js App Router with TypeScript and strict mode.
- React Server Components for read-heavy dashboard pages.
- Client Components only for forms, charts, filters, tables, QR previews, and interactive dialogs.
- Tailwind CSS plus an accessible component layer such as shadcn/ui.
- Zod for client-side form schemas that mirror the API contract.
- React Hook Form for complex forms.
- TanStack Query for client-side cache/invalidation where Server Components are not enough.
- Recharts or a small charting library for analytics.
- `openapi-typescript` or an equivalent generator for typed API contracts.
- Playwright for browser workflows and accessibility smoke checks.

### Backend

- Node.js 22+ with Express 5 and TypeScript strict mode.
- The official MongoDB Node.js driver with one warm-process MongoClient.
- `argon2` for Argon2id password hashing.
- Native Node.js crypto for opaque sessions, CSRF tokens, and API-key hashes.
- Express middleware for CORS, rate limiting, request IDs, and validation boundaries.
- `qrcode` or equivalent for PNG/SVG QR generation.
- A bounded User-Agent parser and optional GeoIP provider/library.
- Structured JSON logging and OpenTelemetry-compatible tracing hooks.

### Infrastructure and integrations

- Vercel for frontend and Node.js functions.
- MongoDB Atlas for the primary database.
- Transactional email provider such as Resend, Postmark, or SES.
- Google/GitHub OAuth in the first provider-enabled release; more providers later.
- Optional safe-browsing and malware-reputation provider.
- Optional error/observability provider such as Sentry and an OpenTelemetry backend.
- Vercel Cron for scheduled rollups and retention tasks.

## 4. Repository and code organization

```text
.
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   └── api/                 # only if a thin BFF route is required
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   └── charts/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── links/
│   │   │   ├── analytics/
│   │   │   └── workspaces/
│   │   ├── lib/
│   │   │   ├── api-client/
│   │   │   ├── auth/
│   │   │   ├── permissions/
│   │   │   └── validation/
│   │   ├── public/
│   │   ├── tests/
│   │   ├── next.config.ts
│   │   └── vercel.json
│   └── api/
│       ├── src/index.ts                # Vercel adapter only
│       ├── src/
│       │   ├── express-app.ts           # Express middleware and route composition
│       │   ├── local-server.ts          # long-running local server
│       │   ├── container.ts             # dependency injection composition root
│       │   ├── config/                  # environment, MongoDB, and Swagger
│       │   ├── controllers/             # HTTP parsing and response mapping
│       │   ├── routes/                  # URL and middleware composition
│       │   ├── services/                # business rules and workflows
│       │   ├── validators/              # Zod request/domain schemas
│       │   ├── middleware/              # request context, auth, CSRF, limits
│       │   ├── repositories/            # repository contracts and Mongo implementations
│       │   ├── models/                  # one Mongo document model per entity
│       │   └── utils/                   # errors, HTTP, crypto, cookies, pagination, DTOs
│       ├── tests/                       # unit, integration, contract tests
│       ├── package.json
│       ├── tsconfig.json
│       └── vercel.json
├── packages/
│   ├── contracts/                      # generated TypeScript types/client
│   └── config/                         # shared lint/format conventions
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   └── threat-model.md
├── package.json                        # workspace scripts
└── pnpm-workspace.yaml
```

Rules:

- `src/index.ts` is a thin Vercel adapter; all real backend code stays under `src/`.
- Handlers translate HTTP into use-case inputs and never contain MongoDB queries.
- Use cases contain business rules and authorization decisions.
- Repositories expose interfaces to use cases and hide MongoDB details.
- Domain types do not depend on Express or Vercel where avoidable; MongoDB document types remain at the storage boundary.
- DTOs are separate from database documents; never serialize password hashes, session hashes, or internal audit fields.
- Frontend features own their UI, schemas, query keys, and data transformations.

### 4.1 Layered modular-monolith architecture

The first backend is a layered modular monolith. Feature files are grouped by
technical layer, matching the reference project, while explicit boundaries
prevent the HTTP layer from becoming a second business layer.

```text
HTTP request
    │
    ▼
routes ──► middleware ──► controllers ──► application services
                                             │
                                             ▼
                                  repository interfaces
                                             │
                                             ▼
                                  MongoDB repositories
```

Dependency direction is inward: routes and controllers may depend on services;
services may depend on repository interfaces and domain utilities; MongoDB
repositories and Express adapters are infrastructure concerns. Services never
import Express, MongoDB collection objects, or request/response types.

Each feature uses matching files across the layer directories where applicable:

```text
routes/<feature>.routes.ts             # URL and middleware composition
controllers/<feature>.controller.ts    # HTTP parsing and response mapping only
services/<feature>.service.ts          # business rules and authorization calls
repositories/<feature>.repository.ts   # persistence contract and Mongo implementation
validators/<feature>.validator.ts      # Zod input constraints
models/<entity>.model.ts                # one persisted document type per file
```

Shared repository interfaces live outside the MongoDB implementation so unit
tests can use fakes. Models are split by persisted entity; collection names
and indexes stay in database configuration/model metadata. They are not returned
directly to clients. Controllers return DTOs
through one response envelope and never issue database queries.

### 4.2 Composition root and dependency injection

`src/container.ts` is the only place that wires concrete dependencies. It:

1. Loads validated environment configuration.
2. Creates one MongoClient per warm process and ensures indexes explicitly.
3. Instantiates repositories, services, controllers, and route modules.
4. Returns the Express app to both the local server and Vercel adapter.

The Vercel adapter caches the initialization promise. Shutdown closes the
MongoClient only for the long-running local server. No module creates a hidden
MongoClient or reads process environment variables during a request.

### 4.3 Cross-cutting HTTP boundaries

Middleware runs in this order: request ID and structured logger, security
headers, CORS, body-size/parser limits, rate limit, public/authenticated route
selection, authentication, CSRF/origin checks for cookie mutations, then the
controller. The final error middleware maps typed application errors to the
stable `{ error: { code, message, request_id } }` response and logs only safe
metadata.

Zod schemas reject malformed input at the controller boundary. Domain
constraints are repeated in services for non-HTTP callers. Object IDs, URLs,
slugs, dates, pagination, and enum values have dedicated reusable constraints.

### 4.4 Data and security practices

- Repositories always include workspace/resource scope in filters.
- Passwords use Argon2id; sessions, reset tokens, CSRF tokens, and API keys are
  random and stored only as hashes where applicable.
- DTO mappers explicitly omit secrets, hashes, raw user agents, and internal
  moderation fields.
- Redirect resolution performs one indexed link lookup and a bounded click-event
  write; analytics enrichment must not turn a redirect into an unbounded query.
- MongoDB operations receive bounded request contexts and use a shared pool.
- Cross-collection workflows are designed to be retry-safe. Transactions are
  used only when the target MongoDB deployment supports replica-set sessions;
  otherwise the service uses explicit compensation/idempotency rules.

### 4.5 Build sequence

The implementation order is: configuration and common primitives; MongoDB
connection, models, indexes, and repository contracts; auth/session module;
workspace and link modules; redirect and analytics path; API keys and admin;
OpenAPI/contract output; then integration and security tests. Every step keeps
the application type-checkable and runnable with `/health`.

## 5. Vercel-compatible backend entrypoint design

Vercel’s Node.js runtime can target a TypeScript/JavaScript handler configured as a function under `src/`. The backend therefore has a small Express adapter that bootstraps the application once per warm instance and delegates to the shared app.

The adapter will:

1. Read and validate environment configuration.
2. Initialize a MongoClient through a module-level promise or equivalent singleton.
3. Build repositories, use cases, middleware, and routes.
4. Reuse the client and router across warm invocations.
5. Use request contexts and bounded timeouts for every database operation.

The MongoDB driver recommends reusing a client and its connection pool. The implementation must not connect and disconnect for every request.

### 5.1 Routing proof-of-concept

Before the full build, implement a tiny spike that proves:

- Node.js handler deployment from `apps/api`.
- `/health` rewrite from the web project.
- `/slug` rewrite on `lnk.example.com` to the redirect handler.
- Request path, query string, `Host`, `X-Forwarded-*`, cookies, and response `Location` survive rewrites.
- One Express function can dispatch the required route set without an unexpected function-count issue.

If the spike fails, keep the same application architecture and use a portable Node.js deployment for `apps/api`; the Next.js deployment does not change.

## 6. Authentication and authorization design

### 6.1 Browser session

The dashboard uses an opaque, random, server-side session cookie rather than putting a long-lived JWT in browser storage.

- Cookie name: `__Host-linkforge_session`.
- `HttpOnly: true`.
- `Secure: true` in production.
- `SameSite: Lax` initially.
- `Path: /`.
- No `Domain` attribute, making it host-only.
- Random value has at least 256 bits of entropy.
- Only a SHA-256/HMAC verifier is stored in MongoDB.
- Session has absolute expiry, idle expiry, last-used timestamp, device label, and revocation state.
- Login rotates the session; password reset, MFA changes, and role escalation revoke or re-authenticate sessions.

This avoids localStorage/sessionStorage credentials. The Next.js app talks to the API through its same-origin `/api` rewrite and sends a CSRF header for state-changing requests.

### 6.2 API clients

Programmatic clients use one of:

- short-lived Ed25519-signed bearer access tokens for interactive API clients; or
- workspace-scoped API keys stored only as hashes, with a visible prefix, scopes, expiry, last-used time, and revocation.

The browser dashboard does not need to expose either credential to JavaScript.

### 6.3 CSRF and CORS

- Same-origin browser requests use a double-submit CSRF token or synchronizer token for `POST`, `PUT`, `PATCH`, and `DELETE`.
- Validate the `Origin` header for browser mutations.
- CORS is narrowly configured for direct API clients and never uses `*` with credentials.
- Cookies are not accepted through URL parameters or request bodies.

### 6.4 Passwords and recovery

- Argon2id with a reviewed memory/time/parallelism configuration.
- Generic login failure messages to avoid account enumeration.
- Login, reset, verification, and API-key creation are rate limited.
- Email verification and password-reset tokens are random, single-use, expiring, and hashed at rest.
- Password reset invalidates existing sessions by default.

### 6.5 Authorization model

Authorization is evaluated by the TypeScript service after authentication:

1. Is the account active and verified when required?
2. Is the user a member of the workspace?
3. Does the role/permission allow this action?
4. Does the resource belong to the workspace and satisfy link visibility rules?
5. Is the workspace within quota and feature entitlement?

Every query includes workspace/resource scope. The frontend may hide controls but cannot grant access.

## 7. HTTP API conventions

Base URL: `/v1` on the API project. The frontend exposes it through `/api`.

### 7.1 Success responses

Single resource:

```json
{
  "data": { "id": "..." }
}
```

Collection:

```json
{
  "data": [ ... ],
  "meta": {
    "next_cursor": "...",
    "has_more": true
  }
}
```

### 7.2 Error responses

Use `application/problem+json` based on RFC 9457 with stable application codes:

```json
{
  "type": "https://docs.example.com/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "detail": "slug contains an unsupported character",
  "request_id": "req_..."
}
```

Never return stack traces, MongoDB errors, token values, password details, or provider credentials.

### 7.3 Endpoint groups

The current implementation is the vertical MVP slice. It includes the core
auth, workspace/member/invitation, link CRUD, redirect, QR, analytics
summary, API-key, abuse-report, and platform-admin routes listed below. OAuth,
imports/exports, webhooks, conversions, and the broader analytics/export
surface remain explicitly planned follow-up modules and are not exposed until
their contracts and persistence workflows are implemented.

Interactive Swagger UI is served at `/docs`; the same contract is available as
machine-readable `/openapi.json` and `/openapi.yaml` documents.

#### Authentication

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `POST /v1/auth/logout-all`
- `POST /v1/auth/refresh`
- `GET /v1/auth/me`
- `GET /v1/auth/csrf`
- `POST /v1/auth/verify-email`
- `POST /v1/auth/verify-email/resend`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `GET /v1/auth/sessions`
- `DELETE /v1/auth/sessions/{sessionId}`
- `GET/POST /v1/auth/oauth/{provider}` and callback flow

#### Workspaces and members

- `GET/POST /v1/workspaces`
- `GET/PATCH/DELETE /v1/workspaces/{workspaceId}`
- `GET/POST /v1/workspaces/{workspaceId}/members`
- `PATCH/DELETE /v1/workspaces/{workspaceId}/members/{memberId}`
- `GET/POST /v1/workspaces/{workspaceId}/invitations`
- `DELETE /v1/workspaces/{workspaceId}/invitations/{invitationId}`
- `GET /v1/invitations/{token}` (public invitation details)
- `POST /v1/invitations/accept` (authenticated acceptance)

#### Links

- `GET/POST /v1/workspaces/{workspaceId}/links`
- `GET/PATCH/DELETE /v1/links/{linkId}`
- `POST /v1/links/{linkId}/pause`
- `POST /v1/links/{linkId}/restore`
- `POST /v1/links/{linkId}/rotate-slug`
- `GET /v1/links/{linkId}/qr`
- `POST /v1/workspaces/{workspaceId}/links/import`
- `GET /v1/workspaces/{workspaceId}/links/export`
- `GET /v1/links/{linkId}/clicks`
- `GET /v1/links/{linkId}/analytics`
- `PATCH /v1/links/{linkId}/rules`

#### Analytics and conversions

- `GET /v1/workspaces/{workspaceId}/analytics/overview`
- `GET /v1/workspaces/{workspaceId}/analytics/timeseries`
- `GET /v1/workspaces/{workspaceId}/analytics/breakdowns`
- `POST /v1/links/{linkId}/conversions`
- `GET /v1/workspaces/{workspaceId}/analytics/export`

#### API automation

- `GET/POST /v1/workspaces/{workspaceId}/api-keys`
- `DELETE /v1/api-keys/{keyId}`
- `GET/POST/PATCH/DELETE /v1/workspaces/{workspaceId}/webhooks`

#### Administration

- `GET /v1/admin/overview`
- `GET /v1/admin/users`
- `GET /v1/admin/workspaces`
- `GET /v1/admin/links`
- `POST /v1/admin/links/{linkId}/quarantine`
- `GET/POST /v1/admin/blocked-destinations`
- `GET /v1/admin/abuse-reports`
- `PATCH /v1/admin/abuse-reports/{reportId}`
- `GET /v1/admin/audit-logs`

The Next.js frontend exposes these capabilities at `/dashboard/admin`. The
navigation entry and page content are shown only when `/v1/auth/me` returns
`is_platform_admin: true`; every `/v1/admin/*` API still independently enforces
the platform-administrator flag as the security boundary.

#### Public redirect

- `GET /{slug}` on the configured platform short-link hostname.
- `HEAD /{slug}` on the configured platform short-link hostname.
- `GET /{slug}/unlock` and `POST /{slug}/unlock` for password-protected links.

All endpoints are described by the OpenAPI document served at `/openapi.yaml`; TypeScript types can be generated from that contract.

## 8. MongoDB data model

### 8.1 `users`

```text
_id
email_normalized
password_hash
display_name
status: active|pending|suspended|deleted
email_verified_at
mfa_settings
created_at, updated_at, deleted_at
```

Indexes: unique `email_normalized`, `status + created_at`.

### 8.2 `auth_sessions`

```text
_id
user_id
token_hash
session_family_id
device_label
user_agent_summary
ip_hash
created_at, last_used_at, expires_at, revoked_at
```

Indexes: unique `token_hash`, `user_id + created_at`, TTL on `expires_at`.

### 8.3 `workspaces`, `workspace_members`, and `workspace_invitations`

Workspace fields include name, slug, plan, status, settings, quotas, and timestamps. Membership fields include workspace ID, user ID, role, named permissions, invitation state, and timestamps. Invitations are separate records so an email address does not need an existing user account before an invite is sent.

```text
workspace_invitations
_id
workspace_id
email
role: admin|editor|analyst|viewer
token_hash
status: pending|accepted|revoked|expired
invited_by
accepted_by, accepted_at
expires_at
created_at, updated_at
```

Invitation tokens are random, sent through Nodemailer, and stored only as
hashes. The public link reveals only safe workspace/email/role details. A new
recipient registers with the token, completes email OTP verification, and is
then added to the workspace; an existing recipient signs in and accepts it.
Pending invitations can be refreshed or revoked by workspace administrators.

Indexes: unique workspace slug, unique `workspace_id + user_id`, `user_id + status`.

### 8.4 `links`

```text
_id
workspace_id
hostname
slug
destination_url
redirect_status: 301|302|307
state: active|paused|expired|quarantined|deleted
title, description
tags, folder_id, campaign_id
expires_at, max_clicks
click_count, last_clicked_at
qr_config
routing_rules[]
protection
created_by, created_at, updated_at, deleted_at
```

Indexes:

- unique `hostname + slug`;
- `workspace_id + updated_at` for dashboard lists;
- `workspace_id + state + updated_at`;
- `campaign_id + updated_at`;
- `expires_at + state` for expiry scans.

Keep deleted slugs reserved by default to avoid stale links and cache ambiguity.

### 8.5 `click_events`

```text
_id
link_id, workspace_id
occurred_at
event_type: redirect|qr_scan|conversion
is_unique_estimate
bot_class
country, region
device_class, os, browser
language
referrer_host, referrer_category
utm_source, utm_medium, utm_campaign, utm_content, utm_term
http_method, response_status
qr_asset_id
retention_expires_at
```

Never persist raw IP by default. If a unique estimate is required, derive a rotating, salted value and expire it separately from aggregate data.

Indexes: `link_id + occurred_at`, `workspace_id + occurred_at`, `retention_expires_at` TTL. Consider a MongoDB time-series collection after event volume justifies it.

### 8.6 `analytics_daily`

Stores precomputed counts by link/workspace/date and bounded dimensions. It powers dashboards after rollups so the UI does not repeatedly scan raw events.

Indexes: unique `link_id + day + dimension_key`, `workspace_id + day`.

### 8.7 Other collections

- `email_tokens` — hashed one-time verification/reset tokens with TTL.
- `api_keys` — prefix, hash, scopes, workspace, expiry, last-used, revoked state.
- `webhooks` and `webhook_deliveries` — signed endpoint configuration and retry state.
- `audit_logs` — actor, action, resource, redacted metadata, request ID, timestamps.
- `abuse_reports` — reporter, link, reason, status, review notes, resolution.
- `blocked_destinations` — normalized hostname/path patterns and reason.
- `conversions` — signed conversion event and attribution metadata.

## 9. Redirect and analytics pipeline

### 9.1 Redirect algorithm

1. Receive request and capture request ID, host, path, user agent, referrer, and Vercel geo headers when available.
2. Normalize host and slug; reject invalid path shapes.
3. Look up `{hostname, slug}` using the unique index.
4. Check state, expiry, click limit, quarantine, and password requirement.
5. Evaluate ordered routing rules using a bounded, deterministic evaluator.
6. Build a sanitized analytics event.
7. Attempt a bounded event insert and counter update. Analytics failure must not prevent a valid redirect.
8. Return `301`, `302`, or `307` with a validated `Location` header.

There must be no server-side fetch to the destination during redirect resolution. Destination safety checks happen at creation/update or through an asynchronous moderation workflow, preventing redirect requests from becoming SSRF primitives.

### 9.2 Rollups

- Vercel Cron calls a protected rollup endpoint every minute or five minutes.
- The job claims a time range, aggregates raw events, and upserts daily/hourly summaries.
- A run is idempotent and safe to retry.
- The cron secret is checked in constant time and never logged.
- Raw-event retention and expired-link scans are separate jobs.

For higher scale, replace the direct event insert with a queue/stream. Do not rely on a background goroutine after writing the HTTP response because serverless instances can be frozen immediately.

## 10. Frontend architecture

### 10.1 Route map

```text
app/
├── (marketing)/
│   ├── page.tsx
│   ├── pricing/page.tsx
│   └── docs/page.tsx
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── verify-email/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── (dashboard)/
│   ├── dashboard/page.tsx
│   ├── links/page.tsx
│   ├── links/new/page.tsx
│   ├── links/[linkId]/page.tsx
│   ├── links/[linkId]/analytics/page.tsx
│   ├── workspace/page.tsx
│   ├── team/page.tsx
│   ├── api-keys/page.tsx
│   └── settings/page.tsx
└── admin/
    ├── page.tsx
    ├── users/page.tsx
    ├── workspaces/page.tsx
    ├── abuse/page.tsx
    ├── audit-logs/page.tsx
    └── analytics/page.tsx
```

### 10.2 Data boundaries

- Server Components fetch dashboard summaries through a server-side API client that forwards the session cookie.
- Client Components receive DTOs, not raw database shapes.
- Mutations use Server Actions or typed API calls with CSRF headers and invalidate the relevant query keys.
- `proxy.ts`/middleware can perform optimistic redirects, but secure authorization remains in the Express API.
- Charts request aggregated data, never unbounded raw click events.
- URL, slug, QR, campaign, and member forms share schema definitions generated from or aligned with OpenAPI.

### 10.3 Caching

- Do not cache authenticated dashboard responses publicly.
- Cache static marketing pages and documentation.
- Do not CDN-cache redirect responses in the accuracy-first MVP because link state and analytics must be current.
- Introduce controlled redirect caching only after event capture, invalidation, and 301 behavior are measured.

## 11. Security requirements

- HTTPS in all non-local environments.
- Argon2id for passwords; no plaintext or reversible password storage.
- Strong random session/API key/verification values; only hashes stored.
- Secure, host-only cookies; no credentials in localStorage.
- CSRF and `Origin` validation for cookie-authenticated mutations.
- Explicit authorization checks at every protected use case.
- Workspace scoping in every repository query.
- Input size limits for JSON, CSV imports, aliases, titles, tags, and destination URLs.
- URL parser rejects dangerous schemes, credentials, control characters, and malformed IDNs.
- Rate limits per IP, account, workspace, API key, and destination creation action.
- CAPTCHA/turnstile extension point for anonymous and suspicious flows.
- Email enumeration resistance.
- Admin step-up authentication for suspension, quarantine, blocklist, secret, and billing actions.
- Audit records for authentication, authorization changes, link changes, exports, and admin actions.
- Security headers: HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and frame protections as appropriate.
- Redact cookies, auth headers, destination query secrets, and raw user-agent/IP data from logs.
- Dependency updates, SAST, secret scanning, SCA, and regular threat-model review.

## 12. Observability

Every request carries a request ID and, when available, a trace ID.

Structured events should include:

- route template and status;
- duration and database duration;
- workspace/user ID only when policy permits;
- link ID and request hostname for redirect diagnostics;
- error code, not raw stack trace;
- deployment/version identifier.

Metrics:

- redirect count, success, not-found, blocked, expired, password-gated;
- redirect latency p50/p95/p99;
- analytics event success/failure and lag;
- MongoDB operation latency and pool exhaustion;
- auth failures, rate-limit hits, abuse reports;
- dashboard API latency and error rate.

## 13. Testing strategy

### Backend

- Unit tests for slug generation, URL validation, routing rules, permissions, session rotation, CSRF, expiry, and analytics classification.
- Repository integration tests against MongoDB using a disposable test database/container.
- Contract tests generated from OpenAPI.
- Security tests for IDOR, role escalation, slug collisions, password reset replay, refresh/session reuse, and rate limits.
- Redirect matrix tests for every state, method, status, rule type, host, and password case.
- Fuzz tests for URL parsing and slug input.
- `npm run typecheck`, `npm run build`, dependency audit, and security tests in CI.

### Frontend

- Unit tests for form schemas, permission-aware UI, formatters, and chart transforms.
- Playwright flows for registration, verification, login, create/edit/pause link, analytics, team roles, and admin quarantine.
- Accessibility checks for keyboard, labels, focus management, contrast, and table/chart alternatives.
- Visual smoke tests for the important dashboard pages.

### System and performance

- Preview deployment smoke test for both Vercel projects.
- k6 or equivalent load tests for redirect, link creation, and analytics endpoints.
- Cold-start and warm-start measurements in the target Vercel region.
- Failure tests where MongoDB is slow/unavailable: valid redirects should degrade predictably.
- Restore/export test for user and workspace data.

## 14. CI/CD and deployment

### Pull request checks

1. Install with a locked package/dependency file.
2. Format and lint web code.
3. Type-check Next.js.
4. Type-check and build the Express/TypeScript API.
5. Validate and lint OpenAPI.
6. Run integration tests with isolated MongoDB.
7. Run security/dependency scans.
8. Build both apps.
9. Deploy preview environments only after checks pass.
10. Run preview smoke tests against health, auth, create-link, redirect, and analytics paths.

### Production deployment

- Merge to main triggers web and API Vercel production deployments.
- Each Vercel project has its own root directory and environment variables.
- MongoDB Atlas production credentials are least-privilege and separate from preview credentials.
- Preview data uses a separate Atlas database/cluster or strictly isolated database name.
- Rollbacks are independent for web and API, but API schema changes follow expand/contract migration rules.
- Migrations/index creation run as an explicit protected deployment step, not on every request.

### Environment variables

Frontend:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_BASE_PATH=/api
NEXT_PUBLIC_SHORT_BASE_URL
NEXT_PUBLIC_ANALYTICS_CONSENT_MODE
```

Backend:

```text
APP_ENV
PORT
MONGODB_URI
MONGODB_DATABASE
APP_URL
API_URL
SHORT_BASE_URL
DEFAULT_SHORT_DOMAIN
SESSION_TTL
SESSION_IDLE_TTL
COOKIE_SECURE
EXPOSE_DEV_TOKENS
PASSWORD_MEMORY_KIB
PASSWORD_ITERATIONS
PASSWORD_PARALLELISM
RATE_LIMIT_REQUESTS
RATE_LIMIT_WINDOW
ANALYTICS_RETENTION_DAYS
EMAIL_FROM
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_SECURE
EMAIL_VERIFICATION_TTL
EMAIL_VERIFICATION_RESEND_COOLDOWN
ALLOWED_ORIGINS
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
OAUTH_GOOGLE_CLIENT_ID
OAUTH_GOOGLE_CLIENT_SECRET
OAUTH_GITHUB_CLIENT_ID
OAUTH_GITHUB_CLIENT_SECRET
CRON_SECRET
SAFE_BROWSING_API_KEY
SENTRY_DSN
```

No secret is committed. Vercel Preview and Production variables are configured separately.

## 15. Implementation roadmap

### Phase 0 — technical spikes and contracts

- Confirm Vercel Node.js routing, rewrites, custom host, cookies, and MongoDB connection reuse.
- Create monorepo skeleton and lint/test commands.
- Write OpenAPI contract and generated frontend client.
- Create MongoDB indexes/migration runner.
- Build a minimal `GET /health` and `GET /{slug}` proof of concept.

### Phase 1 — vertical MVP

- Auth/session/recovery.
- Workspace and role model.
- Link CRUD and public redirect.
- Minimal click events and dashboard summary.
- QR generation.
- Admin quarantine and audit log.
- Vercel Preview/Production deployment.

### Phase 2 — complete MVP

- Email verification, session management UI, exports, filters, tags, campaigns.
- Core analytics breakdowns and rollups.
- API keys and OpenAPI docs.
- Abuse reporting and blocklist.
- Anonymous mode behind a feature flag.

### Phase 3 — growth features

- Bulk import/export, password protection, smart routing, deep links, A/B testing, webhooks, scheduled reports, and MFA.

### Phase 4 — platform features

- Conversion attribution, billing/entitlements, SSO/passkeys, integrations, high-volume event pipeline, and optional non-Vercel redirect deployment.

Each phase ends with a security review, performance measurement, and product acceptance against the PRD.

## 16. Technical decisions awaiting approval

1. Approve two Vercel projects in one monorepo versus Vercel Services in one project.
2. Approve the application, API, and single platform short-link hostnames.
3. Approve server-side opaque browser sessions with HttpOnly cookies instead of browser-stored JWTs.
4. Approve Argon2id and API-key support as the baseline authentication stack.
5. Approve `302` as the default redirect code.
6. Approve best-effort synchronous click capture for MVP followed by rollups; queue/stream comes later.
7. Approve anonymous quick-shorten as disabled by default until abuse controls are tested.
8. Approve a Vercel routing smoke test for the Node.js function adapter.

## 17. Research references

- [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel Services routing](https://vercel.com/docs/services/routing)
- [Vercel rewrites](https://vercel.com/docs/routing/rewrites)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [MongoDB Node.js driver client reuse and pooling](https://www.mongodb.com/docs/drivers/node/current/connect/mongodb-driver/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
