# LinkForge web

The Next.js App Router frontend for LinkForge. It uses local shadcn-style
components, Radix UI primitives, Tailwind CSS, a calm ink/coral/mint/lilac
visual system, responsive dashboard layouts, and a session-cookie integration
with the Express API.

## Run locally

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

When the Express API is running locally, keep this in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SHORT_BASE_URL=http://localhost:8080
```

The landing-page shorten form directs visitors to sign in because anonymous
quick-shortening is disabled by the backend MVP. The authenticated dashboard
requires the API and redirects unauthenticated users to `/login`.

## Structure

The frontend follows the same route-oriented style as the reference project:

```text
app/                    Next.js routes and route-specific UI
  dashboard/            dashboard pages, shell, panels, tables, and dialogs
components/             shared marketing and compatibility UI exports
  ui/                    local shadcn components and Radix-backed primitives
lib/                    API client and shared application types
```

## Pages

- `/` - marketing landing page and authenticated shorten handoff.
- `/login` - sign-in and registration UI using the backend session-cookie contract.
- `/verify-email` - six-digit email OTP verification with resend and local development OTP display.
- `/accept-invitation` - public workspace invitation onboarding; existing users sign in, while new users register and verify their email before joining.
- `/forgot-password` and `/reset-password` - password recovery using emailed reset links.
- `/dashboard` - live workspace click totals, link activity, pause/restore, and creation.
- `/dashboard/links` - live searchable link library, filters, copy, pause, and creation.
- `/dashboard/analytics` - live seven-day link analytics, device/country/referrer breakdowns, and CSV export.
- `/dashboard/settings` - tabbed workspace management for workspace creation, rename, switching, member roles, email invitations, and Owner/Admin API-key creation and revocation.
- `/dashboard/api-docs` - API-key authentication, request examples, scope-to-endpoint mapping, response conventions, errors, and security guidance.
- `/dashboard/admin` - platform-wide counts, paginated users, workspaces, and links, audit activity, abuse-report moderation, link quarantine, and destination blocking; visible only when `is_platform_admin` is true.

## API deployment

The preferred production topology is a separate Vercel project for `apps/api`
and this `apps/web` project. The checked-in `vercel.json` rewrites `/api/*` to
`https://api.example.com/*`; replace that hostname with the deployed Express API
hostname before deploying. Alternatively set `NEXT_PUBLIC_API_URL` to the API
origin and the client will call it directly.

For the rewrite-based topology, the browser stays on the frontend origin and
the Express backend still owns authentication, CSRF validation, authorization,
and all business rules. Configure the backend `ALLOWED_ORIGINS` and production
cookie settings to match the deployed frontend.

## Quality checks

```powershell
npm run typecheck
npm run build
npm run format:check
npm audit --omit=dev
```

The pinned PostCSS version includes the current security patches. npm may still
report moderate advisories in Tailwind 3's build-time selector parser; resolving
those requires a separately tested Tailwind 4 migration rather than a forced
major upgrade.
