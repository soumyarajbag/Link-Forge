# LinkForge

A learning-focused URL-shortener monorepo planned in [`PRD.md`](PRD.md) and [`TRD.md`](TRD.md).

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

## Individual App Documentation

- Backend details & local setup: [`apps/api/README.md`](apps/api/README.md)
- Web application details: [`apps/web/README.md`](apps/web/README.md)
- Local API documentation: `http://localhost:8080/docs` (when API is running)
