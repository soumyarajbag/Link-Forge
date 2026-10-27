# LinkForge

A full-stack URL-shortener and link-management monorepo built with Next.js,
Express, TypeScript, and MongoDB. Product requirements and technical decisions
are maintained in [`PRD.md`](PRD.md) and [`TRD.md`](TRD.md).

## Current Capabilities

- Email/password registration with six-digit email OTP verification.
- Password recovery, secure cookie sessions, CSRF protection, and session revocation.
- Email-based workspace invitations for existing and new users.
- Multiple workspaces with Owner, Admin, Editor, Analyst, and Viewer roles.
- Short-link creation, editing, custom slugs, campaigns, tags, QR codes, pause/restore, expiry, and click limits.
- Link analytics with daily, country, device, and referrer breakdowns.
- Owner/Admin API-key creation, scoped access, revocation, and in-app documentation at `/dashboard/api-docs`.
- Platform-administrator views for users, workspaces, links, audit activity, abuse reports, quarantine, and destination blocking.
- Swagger UI at `/docs` with machine-readable OpenAPI JSON and YAML contracts.

Links use the single platform hostname configured by `DEFAULT_SHORT_DOMAIN` and
`SHORT_BASE_URL`. Workspace-managed custom domains are not part of the current
product.

## Application Data Flow

The diagram below shows the main user, workspace, link, analytics, invitation,
and platform-administration paths. Solid boundaries represent application
components; decision branches show the conditions that change the next step.

```mermaid
flowchart TD
    Visitor([Visitor]) --> Web[Next.js web application]
    Web --> PublicAPI[Public Express API]

    subgraph Authentication[Authentication and onboarding]
        Register[Register with email and password] --> SendOTP[Send six-digit email OTP]
        SendOTP --> Verify{Email verified?}
        Verify -- No --> Resend[Resend OTP or remain pending]
        Resend --> SendOTP
        Verify -- Yes --> CreateSession[Create secure session]
        Login[Sign in] --> LoginCheck{Account verified?}
        LoginCheck -- No --> SendOTP
        LoginCheck -- Yes --> CreateSession
        CreateSession --> WorkspaceList[List accessible workspaces]
    end

    Web --> Register
    Web --> Login
    PublicAPI --> Register
    PublicAPI --> Login
    PublicAPI --> Verify
    PublicAPI --> CreateSession
    PublicAPI --> WorkspaceList
    SendOTP --> Mail[(Nodemailer / SMTP)]

    subgraph Invitations[Workspace invitation flow]
        Invite[Admin invites an email] --> InvitationMail[Send invitation email]
        InvitationMail --> InvitationPage[Open invitation link]
        InvitationPage --> HasAccount{Account already exists?}
        HasAccount -- Yes --> Login
        HasAccount -- No --> Register
        CreateSession --> Accept[Accept invitation for matching email]
        Accept --> Membership[Create workspace membership with invited role]
        Membership --> WorkspaceList
    end

    WorkspaceList --> SelectWorkspace[Select active workspace]
    SelectWorkspace --> RoleCheck{Workspace role / permission}
    RoleCheck -- Owner or Admin --> Manage[Manage workspace, members, invitations, API keys]
    RoleCheck -- Editor --> EditLinks[Create, edit, pause, and restore links]
    RoleCheck -- Analyst --> ReadData[Read links and analytics]
    RoleCheck -- Viewer --> ViewOnly[View permitted workspace data]

    subgraph LinkLifecycle[Link lifecycle]
        CreateLink[Submit destination, slug, campaign, and options] --> Validate[Validate request and permissions]
        Validate --> PersistLink[(MongoDB link document)]
        PersistLink --> ShortURL[Return short URL]
        ShortURL --> PublicRedirect[Visitor opens /r/:slug]
        PublicRedirect --> LinkState{Link active and within limits?}
        LinkState -- No --> Stop[Return unavailable response]
        LinkState -- Yes --> ClickEvent[(Persist click event)]
        ClickEvent --> Destination[Redirect to destination URL]
        ClickEvent --> Analytics[Aggregate analytics by date, country, device, and referrer]
    end

    EditLinks --> CreateLink
    Manage --> CreateLink
    PublicAPI --> Validate
    Visitor --> PublicRedirect
    PublicRedirect --> PublicAPI
    Analytics --> ReadData
    Analytics --> DashboardAnalytics[Dashboard analytics]

    subgraph Integrations[Programmatic access]
        GenerateKey[Owner/Admin creates scoped API key] --> StoreHash[(Store key hash and scopes)]
        Client[Trusted server integration] --> APIKeyHeader[Send X-API-Key header]
        APIKeyHeader --> ScopeCheck{Key active and scope allowed?}
        ScopeCheck -- No --> Deny[Return authorization error]
        ScopeCheck -- Yes --> Validate
        StoreHash --> ScopeCheck
    end

    Manage --> GenerateKey
    PublicAPI --> ScopeCheck

    subgraph PlatformAdmin[Platform administration]
        AdminUser[Platform administrator] --> AdminCheck{is_platform_admin = true?}
        AdminCheck -- No --> DenyAdmin[Return forbidden response]
        AdminCheck -- Yes --> AdminConsole[View all users, workspaces, links, and audit activity]
        AdminConsole --> Moderation[Review abuse reports, quarantine links, block destinations]
        AdminConsole --> Audit[Inspect human-readable audit activity]
    end

    CreateSession --> AdminUser
    PublicAPI --> AdminCheck
    Manage --> AuditEvent[(Persist audit event)]
    EditLinks --> AuditEvent
    GenerateKey --> AuditEvent
    Moderation --> AuditEvent
    AuditEvent --> Audit

    classDef client fill:#fff4f0,stroke:#f07c62,color:#2d2942;
    classDef api fill:#f2efff,stroke:#7168bd,color:#2d2942;
    classDef store fill:#eefaf3,stroke:#47b77a,color:#2d2942;
    classDef decision fill:#fff8ec,stroke:#f5a543,color:#2d2942;
    class Visitor,Web,Client client;
    class PublicAPI,Register,Login,CreateSession,WorkspaceList,Invite,Accept,Validate api;
    class Mail,PersistLink,ClickEvent,Analytics,StoreHash,AuditEvent store;
    class LoginCheck,HasAccount,RoleCheck,LinkState,ScopeCheck,AdminCheck,Verify decision;
```

At a high level, the API is the policy and persistence boundary: the web app
renders the flows, Express validates and authorizes requests, MongoDB stores
users/workspaces/links/events, SMTP delivers OTP and invitation messages, and
the redirect path records a click before sending the visitor to the destination.

## Monorepo Structure

```text
.
├── .gitignore             # Shared monorepo gitignore
├── .prettierrc.json       # Shared code formatting configuration
├── .prettierignore        # Shared formatting ignore rules
├── package.json           # Root workspace configuration & monorepo scripts
├── PRD.md
├── TRD.md
└── apps/
    ├── api/               # Express 5 + TypeScript + MongoDB backend
    └── web/               # Next.js 16 + Tailwind CSS frontend
```

## Workspace Scripts

Install all workspace dependencies from the repository root:

```powershell
npm install
```

Run commands from the repository root across packages:

```powershell
# Development
npm run dev:api            # Start API in watch mode
npm run dev:web            # Start Next.js web application

# Build & Quality checks
npm run build              # Build all workspaces
npm run typecheck          # Typecheck all workspaces
npm run test               # Run tests across workspaces
npm run format             # Format all files with Prettier
npm run format:check       # Check formatting

# Vercel Deployments (CLI)
npm run deploy:api         # Deploy API preview
npm run deploy:api:prod    # Deploy API to production
npm run deploy:web         # Deploy Web preview
npm run deploy:web:prod    # Deploy Web to production
```

## Run Locally

Create the application environment files:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Start MongoDB:

```powershell
docker compose -f apps/api/docker-compose.yml up -d mongo
```

Then start the backend and frontend in separate terminals from the repository
root:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Swagger API documentation: `http://localhost:8080/docs`

The dashboard Settings page contains Workspace and Team access tabs. Workspace
owners and admins also receive a Developer tab for API-key management.

## Individual App Documentation

- Backend details & local setup: [`apps/api/README.md`](apps/api/README.md)
- Web application details: [`apps/web/README.md`](apps/web/README.md)
- Local API documentation: `http://localhost:8080/docs` (when API is running)
