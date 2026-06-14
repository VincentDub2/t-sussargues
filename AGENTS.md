# AGENTS.md

## 1. Project overview

T-Sussargues is an internal web application for the municipal staff of Sussargues. It centralizes intervention requests, purchase requests, workflow tracking, role-based administration, email notifications, documents, and action history.

Main technologies:

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS v4 and shadcn/ui-style components
- Prisma ORM with PostgreSQL
- NextAuth/Auth.js for authentication
- Nodemailer for email delivery
- LangChain/LangGraph for request assistant features

The global product specifications are in `spec.md`. Read it before making functional or UX changes.

## 2. Repository structure

- `src/app`: Next.js routes, layouts, pages, Server Actions, and API route handlers.
- `src/app/(app)`: Authenticated application pages such as dashboard, interventions, purchases, and admin screens.
- `src/app/api`: API endpoints for auth, document access, and AI agents.
- `src/components`: Reusable UI, layout, auth, admin, intervention, purchase, and agent components.
- `src/lib`: Business logic, Prisma access, permissions, notifications, email, file storage, and workflow helpers.
- `src/auth.ts`: NextAuth/Auth.js configuration.
- `src/types`: Shared TypeScript type declarations.
- `prisma/schema.prisma`: Database schema.
- `prisma/migrations`: Prisma migrations.
- `prisma/seed.ts`: Seed data.
- `public`: Static assets.
- `README.md`: Project summary and basic setup.
- `.env.example`: Required environment variable template.

## 3. Setup and run commands

Use Node.js `24.x` and pnpm `10.12.1`, as declared in `package.json`.

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm dev
```

The local app runs at `http://localhost:3000`.

Database and Prisma commands:

```bash
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:seed
```

TODO: Document the expected local PostgreSQL/Prisma Postgres startup flow. No Docker Compose file is currently present in the repository.

## 4. Development guidelines

- Keep changes small, focused, and aligned with existing project patterns.
- Prefer TypeScript types, Prisma models, and Zod validation over untyped data handling.
- Put route UI in `src/app`, reusable components in `src/components`, and business logic in `src/lib`.
- Use Server Actions for form mutations when that matches the existing route pattern.
- Use Route Handlers for API endpoints and integration-specific behavior.
- Handle errors explicitly and return user-safe messages.
- Do not expose internal errors, stack traces, credentials, or sensitive data to users or logs.
- Keep logging minimal and useful.
- Preserve the existing visual language and color palette:
  - Primary blue `#1E4FA3`
  - Deep blue `#123B7A`
  - Gold/yellow `#F2C94C`
  - Limestone `#F7F1E6`
  - Soft sand `#EFE3D0`
  - Garrigue green `#6B8E4E`
  - Olive dark `#3F5F3A`
  - Background `#FAF8F3`
  - Surface/card `#FFFFFF`
  - Border `#E5DED2`
  - Text main `#172033`
  - Text muted `#6B7280`
  - Success `#2F855A`
  - Warning `#D97706`
  - Danger `#DC2626`
  - Info `#2563EB`

## 5. Testing and validation

Run available validation before considering a task complete:

```bash
pnpm lint
pnpm prisma:validate
pnpm build
```

TODO: Add test commands when a test runner is introduced. No Jest, Vitest, or Playwright configuration is currently defined.

TODO: Add a formatting command if the project standardizes on one. No dedicated format script is currently defined.

## 6. Security rules

- Never hardcode credentials, API keys, tokens, passwords, SMTP credentials, database URLs, or secrets.
- Use environment variables and keep `.env` files out of version control.
- Do not log sensitive data, authentication payloads, reset tokens, invitation tokens, or uploaded document contents.
- Be careful with file system access, uploaded files, network calls, and sandbox execution.
- Validate and authorize access to private routes, admin actions, purchase documents, and workflow mutations.
- Do not weaken authentication, authorization, password hashing, or session handling without explicit approval.

## 7. Agent workflow

- Inspect the relevant files and existing patterns before changing code.
- Reuse current components, helpers, Prisma models, and action patterns.
- Prefer minimal changes over broad refactors.
- Update documentation when behavior, setup, or architecture changes.
- If database schema changes are required, update Prisma schema and migrations intentionally.
- Run the available validation commands and mention any command that could not be run.

## 8. Completion checklist

- The app builds or starts correctly for the changed area.
- Available tests, linting, type checks, Prisma validation, or build commands were run.
- No secrets, credentials, or sensitive data were added.
- Documentation was updated when needed.
- The change is minimal, focused, and consistent with existing architecture.
