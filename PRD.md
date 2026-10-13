# LinkForge — Product Requirements Document

**Status:** Draft for approval  
**Version:** 0.1  
**Date:** 2026-10-18  
**Working name:** LinkForge

## 1. Product summary

LinkForge is a link-management platform for creating short, branded, measurable URLs. It combines the simple experience of a public URL shortener with the campaign, team, analytics, custom-domain, QR-code, and smart-routing capabilities expected from modern link platforms.

The product has three surfaces:

1. A public marketing and quick-shorten experience.
2. An authenticated dashboard for links, workspaces, domains, campaigns, QR codes, and analytics.
3. A fast redirect and tracking service that resolves a short URL and sends the visitor to the correct destination.

The initial deployment target is Vercel for both the Next.js frontend and Express/TypeScript backend, with MongoDB Atlas as the database. The architecture must remain portable if redirect traffic eventually outgrows serverless functions.

## 2. Product principles

- **Short links should be trustworthy:** HTTPS, abuse reporting, destination validation, safe defaults, and visible ownership.
- **Links should be editable:** a printed or published short URL should not need to change when its destination changes.
- **Analytics should be useful without being invasive:** collect aggregated campaign data, minimize personal data, honor retention and privacy controls.
- **The redirect path is sacred:** the public redirect must be fast, reliable, and independent from the dashboard UI.
- **Security is a product feature:** authentication, authorization, session termination, auditability, and abuse prevention are part of the baseline.
- **Progressive complexity:** the MVP is focused, but the data model and permissions support advanced features later.
- **Vercel-friendly by design:** stateless handlers, reusable database clients, no reliance on local disk, and no untracked background workers.

## 3. Problem statement

People can shorten a URL in seconds, but they struggle to:

- remember and organize links after creation;
- update a destination without changing a published URL;
- use their own brand or domain;
- understand which campaign, channel, device, or location produced traffic;
- collaborate safely with a team;
- generate a reusable QR code;
- route one link to different destinations by country, device, language, or experiment;
- protect public short links from spam, phishing, malicious destinations, and abuse.

## 4. Personas and jobs to be done

### 4.1 Individual creator

Needs to shorten, customize, organize, share, edit, and measure links without learning a marketing platform.

### 4.2 Marketer or growth operator

Needs branded domains, UTM governance, campaign folders, QR codes, dashboards, exports, conversion tracking, and reliable historical reports.

### 4.3 Agency or multi-brand operator

Needs multiple workspaces/domains, team roles, client separation, bulk import/export, API access, and per-workspace analytics.

### 4.4 Developer or automation user

Needs scoped API keys, idempotent link creation, predictable errors, webhooks, rate limits, and OpenAPI documentation.

### 4.5 Platform administrator

Needs to control users, workspaces, plans, domains, links, abuse reports, blocked destinations, audit logs, retention, and global service health.

### 4.6 Public visitor

Needs the requested short URL to redirect quickly, safely, and consistently on desktop, mobile, crawlers, and QR scans.

## 5. Goals and success metrics

### 5.1 Product goals

1. Create a usable short link in under 10 seconds for a signed-in user.
2. Make every created link searchable, editable, disable-able, and measurable.
3. Provide clear analytics within one minute for normal traffic.
4. Give workspace owners safe collaboration and delegated access.
5. Support a branded primary short domain and a clean path to additional custom domains.
6. Keep the redirect path small enough to scale independently from the dashboard.
7. Deploy frontend and backend from a monorepo using two Vercel projects and one MongoDB Atlas database.

### 5.2 Initial targets

These are engineering targets, not promises until load testing validates them:

- Redirect resolution p95 under 400 ms at the selected Vercel/MongoDB region.
- Dashboard API p95 under 800 ms for ordinary CRUD and summary queries.
- 99.9% monthly availability target for the production redirect endpoint.
- Analytics freshness under 60 seconds for normal event volume.
- Zero critical or high-severity findings in the release security checklist.
- 100% of protected API operations covered by an explicit authorization test.

### 5.3 Product metrics

- Time to first link.
- Successful link-creation rate.
- Percentage of links with a custom alias, QR code, or campaign tag.
- Weekly active workspaces.
- Redirect success rate and redirect latency.
- Click-to-unique ratio.
- Analytics dashboard usage and export usage.
- Abuse reports per 10,000 active links.
- Sign-up-to-first-link conversion.
- API error rate and rate-limit rejection rate.

## 6. Scope and phased feature plan

“All features from every URL-shortener website” is not a bounded requirement: products differ by plan, region, integrations, and proprietary systems. The plan below captures the common feature superset and places expensive or high-risk features behind later milestones.

### 6.1 Phase 0 — foundation and MVP

#### Identity and account

- Email/password registration and login.
- Email verification.
- Forgot-password and reset-password flow.
- Secure refresh sessions, logout, logout-all, and session/device management.
- Optional Google and GitHub login behind a provider configuration flag.
- Default personal workspace created at registration.
- Account deletion and data-export request entry points.

#### Link creation and management

- Create a short link from an `http` or `https` destination.
- Generate a collision-safe random slug.
- Choose a custom alias subject to reserved-word, length, character, and uniqueness rules.
- Choose a workspace-owned short domain.
- Edit destination, title, tags, notes, and campaign metadata.
- Activate, pause, archive, restore, and soft-delete links.
- Expiry by timestamp and optional click-count limit.
- Default `302` redirect for editable links; optional `301` with a warning because caches may retain it.
- Search, filter, sort, and cursor pagination in the dashboard.
- Copy, share, and preview actions.

#### Analytics baseline

- Total clicks and estimated unique visitors.
- Clicks over time with configurable date range and timezone display.
- Country, region where available, referrer, device class, operating system, browser, language, and HTTP status.
- Human/bot classification with an explicit “estimated” label.
- UTM/campaign attribution.
- QR-scan attribution when a QR code is used.
- Link-level and workspace-level summaries.
- CSV export for permitted data.
- Privacy controls, retention policy, and opt-out handling.

#### QR codes

- Generate a dynamic QR code for every link.
- Download PNG and SVG.
- QR destination remains editable because it resolves through the short link.
- Basic color and size options with contrast validation.

#### Workspace and authorization

- Personal and shared workspaces.
- Invite members by email.
- Roles: Owner, Admin, Editor, Analyst, Viewer.
- Link ownership and workspace-level authorization.
- Audit log for security-sensitive and administrative actions.

#### Platform administration

- Admin-only dashboard.
- User, workspace, link, domain, and abuse-report search.
- Suspend/unsuspend users and workspaces.
- Disable or quarantine links.
- Destination/domain blocklist.
- Global click and sign-up summaries.
- Audit-log search and export.
- Plan/feature entitlement flags, even before billing is enabled.

#### Public and API surface

- Public landing page with authenticated create flow.
- Optional anonymous quick-shorten mode with a very short expiry, strict IP/device quotas, no analytics history, and a claim-on-sign-up path. This mode can be disabled in production.
- Versioned REST API with OpenAPI documentation.
- Scoped API keys for automation, with rate limits and last-used metadata.
- Public redirect endpoint supporting `GET` and `HEAD`.

### 6.2 Phase 1 — growth and team features

- Multiple custom domains and domain verification instructions.
- Branded domain link creation and per-domain analytics.
- Bulk link creation from CSV and bulk export.
- Folders, tags, campaigns, link bundles, and saved filters.
- Password-protected links with a branded unlock page.
- Country/region targeting.
- Device/OS targeting and iOS/Android fallback destinations.
- A/B or weighted destination splits.
- Schedule-based destination rules.
- Link preview controls and social metadata.
- Custom QR colors, finder shapes, logo, frame, and PDF export.
- Webhooks for link lifecycle and selected analytics events.
- Google Analytics/UTM helper and campaign templates.
- Scheduled analytics reports by email.
- Member-level permissions and link visibility rules.
- MFA using TOTP and recovery codes.

### 6.3 Phase 2 — advanced platform features

- Conversion events and revenue attribution.
- Pixel/retargeting integrations with consent-aware controls.
- SSO/SAML/OIDC for enterprise workspaces.
- WebAuthn/passkeys.
- Billing, plans, usage quotas, invoices, and Stripe integration.
- White-label workspace branding and custom error/expired pages.
- AI-assisted slug/title/tag suggestions with opt-in data handling.
- Link cloaking/preview modes where legally and ethically appropriate; never use it to bypass safety controls.
- High-volume event pipeline, precomputed rollups, and warehouse export.
- Advanced domain routing, regional failover, and a non-Vercel redirect deployment option.

## 7. Detailed functional requirements

### 7.1 Link rules

1. Destination must use `http` or `https`; reject `javascript:`, `data:`, `file:`, embedded credentials, malformed URLs, and unsupported schemes.
2. Destination is normalized but the user’s query string and path are preserved.
3. Slugs are case-sensitive in storage but normalized to lowercase for the public product unless a future plan explicitly supports case-sensitive aliases.
4. Reserved paths include `api`, `admin`, `auth`, `login`, `register`, `dashboard`, `docs`, `health`, `settings`, and system-owned paths.
5. A slug is unique within a short domain, not necessarily globally across all domains.
6. Editing a destination does not change the slug or QR code.
7. Paused, expired, click-limited, deleted, or quarantined links resolve to a controlled status page, never to a stale destination.
8. Link deletion is soft deletion first; hard deletion is an admin/data-retention operation.
9. Bulk creation is all-or-nothing per file row with a downloadable error report.
10. A short link may have a default destination plus ordered routing rules.

### 7.2 Redirect behavior

- `GET /{slug}` resolves the host and slug, evaluates link status/rules, records a minimal click event, and returns a redirect.
- `HEAD /{slug}` returns the same status and `Location` behavior without an HTML body.
- Default redirect is `302 Found` so destination edits take effect immediately.
- `301 Moved Permanently` is opt-in and shown with a cache warning.
- Password-protected links return an unlock page, set a short-lived scoped cookie after success, and then redirect.
- Unknown or invalid links return a branded `404` page/status.
- The redirect handler must not require dashboard JavaScript, a frontend session, or a dashboard database query.

### 7.3 Routing rules

Rules are evaluated by explicit priority. A rule can match:

- country or region;
- device class or operating system;
- language;
- referrer category;
- time window and timezone;
- percentage bucket for A/B testing.

Each rule has a destination, status, active flag, and optional fallback. The system must prevent circular rules and must expose the selected rule in an internal trace, not in the public URL.

### 7.4 Analytics definitions

- **Click:** a redirect request accepted by the link resolver.
- **Unique visitor:** an estimated deduplicated visitor using a privacy-preserving rotating fingerprint, not a permanent raw IP identity.
- **Human click:** a heuristic classification; bot detection is not perfect.
- **QR scan:** a click whose signed tracking marker identifies a QR asset, not merely a normal browser click.
- **Session:** a short analytics window, configurable and documented; do not present it as a login session.
- **Conversion:** a user-defined event received through a signed event endpoint or JavaScript SDK.

Raw event retention defaults to 90 days. Daily/monthly aggregates remain longer according to the workspace plan and privacy policy.

### 7.5 Custom domains

- A workspace owner creates a domain record.
- The system generates verification instructions and a nonce.
- The owner adds a DNS TXT or CNAME record.
- Verification is repeatable and auditable.
- A verified domain may be attached to a workspace after platform-domain configuration succeeds.
- The system validates HTTPS, host ownership, and reserved hostnames.
- The link resolver uses the request `Host` plus slug to find the domain.
- Domain removal is blocked while active links use it unless the owner explicitly chooses a migration action.

The first release may support manual Vercel domain attachment and verification. Automated domain provisioning is a later integration because it depends on Vercel account permissions and plan capabilities.

### 7.6 Authentication and authorization

The authentication system must provide:

- verified email before sensitive workspace actions;
- Argon2id password hashing with a password policy;
- short-lived access tokens or server-side session proofs;
- rotating refresh sessions stored as hashes;
- refresh-token reuse detection and session-family revocation;
- secure logout and logout-all;
- password reset tokens that are single-use, hashed at rest, and expire;
- session/device list and revocation;
- MFA extension point;
- OAuth provider state and PKCE validation;
- CSRF protection for cookie-authenticated state changes;
- login throttling, suspicious-login logging, and generic credential errors.

Authorization must be enforced in the Express API for every protected operation. Frontend route guards are UX only and never the security boundary.

### 7.7 Administration

Platform administrators can:

- search and inspect users, workspaces, domains, links, and reports;
- suspend accounts and revoke all sessions;
- quarantine links and destinations;
- manage global reserved slugs and blocked domains;
- inspect global aggregate analytics without exposing raw personal data unnecessarily;
- view audit logs;
- change feature flags and quota entitlements;
- trigger data-retention and rollup jobs;
- manage support notes with access logging.

Admin actions require explicit permissions and produce immutable audit entries.

## 8. Permissions matrix

| Capability              | Owner | Admin |     Editor | Analyst |   Viewer | Platform admin |
| ----------------------- | ----: | ----: | ---------: | ------: | -------: | -------------: |
| View workspace          |   Yes |   Yes |        Yes |     Yes |      Yes |            Yes |
| Create links            |   Yes |   Yes |        Yes |      No |       No |            Yes |
| Edit/delete links       |   Yes |   Yes | Own/shared |      No |       No |            Yes |
| View analytics          |   Yes |   Yes |   Optional |     Yes | Optional |            Yes |
| Export analytics        |   Yes |   Yes |   Optional |     Yes |       No |            Yes |
| Manage members          |   Yes |   Yes |         No |      No |       No |            Yes |
| Manage domains          |   Yes |   Yes |         No |      No |       No |            Yes |
| Manage API keys         |   Yes |   Yes |         No |      No |       No |            Yes |
| Manage billing          |   Yes |    No |         No |      No |       No |            Yes |
| Quarantine link         |    No |    No |         No |      No |       No |            Yes |
| Manage global blocklist |    No |    No |         No |      No |       No |            Yes |

“Optional” permissions are configurable at the workspace level and must be represented as named permissions rather than hard-coded role checks.

## 9. Non-functional requirements

### Performance

- Redirect resolution does one indexed domain/slug lookup and one bounded event write.
- Dashboard list endpoints use cursor pagination and enforce maximum page sizes.
- Analytics queries use precomputed daily aggregates after the rollup milestone.
- MongoDB client is initialized once per warm function instance and reused.
- The database and Vercel function region are selected together.

### Reliability

- Redirects remain available if analytics enrichment fails; the system records a degraded event or samples it rather than failing the redirect.
- Link edits are idempotent when clients send an idempotency key.
- Cron and rollup jobs are safe to retry.
- All critical writes include a request ID and audit context.

### Privacy

- Do not store raw IP by default.
- Store coarse geolocation and derived dimensions with documented accuracy.
- Support DNT/consent configuration for non-essential analytics.
- Provide retention and export/delete workflows.
- Keep analytics data separated from identity data where practical.

### Accessibility and UX

- WCAG 2.2 AA target for dashboard forms, tables, charts, and dialogs.
- Keyboard-operable link creation and filters.
- Color is never the only indicator in analytics charts.
- Copy buttons expose accessible labels and success feedback.
- Loading, empty, error, and stale-data states are designed explicitly.

## 10. Out of scope for the first implementation

- Building a full identity provider for other products.
- Sending marketing email infrastructure ourselves.
- Guaranteeing exact bot/human identification.
- Automatic purchase of domains.
- Server-side malware scanning without an approved provider.
- Native mobile apps.
- Real-time collaborative editing.
- Arbitrary HTML/JavaScript injection into redirect pages.

## 11. Risks and mitigations

| Risk                                                   | Impact                          | Mitigation                                                                                    |
| ------------------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Node.js runtime and serverless connection reuse        | Deployment or runtime surprises | Keep a warm-instance MongoClient singleton and a portable Express entrypoint                  |
| Serverless database connection bursts                  | MongoDB connection exhaustion   | Reuse a global MongoClient, cap pool size, set timeouts, colocate region                      |
| Public short links attract abuse                       | Reputation and legal risk       | Quotas, blocklists, reporting, quarantine, rate limits, destination validation, admin tooling |
| Raw analytics becomes privacy-sensitive                | Compliance and trust risk       | Minimize IP data, retention controls, consent, aggregation, export/delete                     |
| 301 caching prevents destination edits                 | Broken campaigns                | Default to 302; warn before 301; document cache behavior                                      |
| Analytics write slows redirects                        | Latency and failed clicks       | Bounded event write, graceful degradation, later queue/rollup pipeline                        |
| Custom domain automation depends on Vercel permissions | Onboarding friction             | Manual DNS verification first; automate after provider contract is proven                     |
| Feature breadth delays launch                          | No usable product               | Ship by phase gates; implement P0 end-to-end before P1                                        |

## 12. Approval gates

Before implementation, approve or change these decisions:

1. Working name and primary domain strategy.
2. Authentication choice: email/password first, OAuth optional, MFA in Phase 1.
3. Anonymous shortening enabled or disabled by default.
4. Default redirect status: recommended `302`.
5. Analytics privacy and raw-event retention policy.
6. Whether paid plans/billing are part of the first release or only feature entitlements.
7. Whether custom domains are manual in MVP or required for launch.
8. Whether deployment must remain fully Vercel-hosted even if Node.js runtime constraints appear.

## 13. Research basis

The scope was informed by feature sets publicly described by Bitly, Rebrandly, Short.io, Dub, and TinyURL: branded/custom domains, aliases, QR codes, detailed click/device/geography/referrer analytics, teams/roles, bulk/API workflows, targeting, expiration, password protection, deep links, A/B testing, exports, and conversion attribution.

- [Bitly URL shortener features](https://bitly.com/pages/products/url-shortener/)
- [Rebrandly analytics](https://www.rebrandly.com/analytics)
- [Short.io feature list](https://short.io/features)
- [Dub link platform](https://dub.co/)
- [TinyURL product page](https://tinyurl.com/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
