# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Layout

```
apps/
  web/        # Next.js 16 App Router (the deployed web app)
  mobile/     # Expo Router skeleton (Phase 0 bootstrap; no behavior yet)
packages/
  shared/     # Shared TS source (types, calculators, schemas) — empty placeholder
supabase/     # SQL migrations
```

This is an npm-workspaces monorepo. Always run `npm install` from the repo root.

## Commands (run from repo root)

```bash
npm install               # Install all workspace deps
npm run dev               # Alias for dev:web
npm run dev:web           # Start web dev server (localhost:3000)
npm run dev:mobile        # Start Expo dev server
npm run build             # Build apps/web
npm run lint              # Lint apps/web
npm run test              # Run apps/web vitest suite
npm run type-check        # tsc --noEmit on apps/web
```

For workspace-scoped commands:

```bash
npm --workspace apps/web run <script>
npm --workspace apps/mobile run <script>     # e.g. start, ios, android, web
npx --workspace apps/web vitest run src/lib/expense-calculator.test.ts
```

For Expo health check: `cd apps/mobile && npx expo-doctor`.

## Workflow

Every code change MUST follow ALL steps below in order. No skipping.

1. Create (or confirm) a GitHub issue exists
2. Create feature branch: `git checkout -b feat/issue-{N}-short-description`
3. Implement
4. **Spawn test agent** → fix all failures before proceeding
5. **Spawn PR review agent** (`everything-claude-code:code-reviewer`) → fix all issues it raises
6. Rerun tests → confirm pass
7. Ask user to review and approve
8. Only after user approval: `git push`, create PR, ask user to merge
9. Update `todo.md` and `progress.md`

## Architecture (apps/web)

### Route Groups
- `apps/web/src/app/(auth)/` — public auth pages (login, callback)
- `apps/web/src/app/(app)/` — authenticated app pages; `layout.tsx` enforces auth
- `apps/web/src/app/admin/` — requires `admin` or `super_admin` role
- `apps/web/src/app/super-admin/` — requires `super_admin` role
- `apps/web/src/app/invite/[token]/` — public invite acceptance (no auth required)
- `apps/web/src/app/api/` — all API routes (co-located under `app/`)

### Key Libraries
- `apps/web/src/lib/supabase/client.ts` — browser Supabase client (use in Client Components)
- `apps/web/src/lib/supabase/server.ts` — server Supabase client using cookies (Server Components / Route Handlers)
- `apps/web/src/lib/expense-calculator.ts` — greedy minimize-transactions algorithm
- `apps/web/src/lib/notifications.ts` — Resend (email) + Twilio (SMS) helpers
- `apps/web/src/proxy.ts` — auth guard + role enforcement on every request (Next.js 16 proxy convention)

### Data Model (Supabase)
Tables: `profiles`, `events`, `event_participants`, `invitations`, `expenses`, `expense_splits`, `tasks`

- `profiles.role` — `user | admin | super_admin`
- `event_participants.role` — `organizer | participant` (per-event role)
- All tables have RLS enabled. Access based on `auth.uid()` and event participation.

### Expense Splitting Algorithm
Net balance = Σ(paid) − Σ(owed). Greedy matching of largest debtor ↔ largest creditor minimizes transaction count. Supports `equal` and `custom` split types.

### Environment Variables
See `apps/web/.env.local.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `NEXT_PUBLIC_APP_URL`.

## Mobile (apps/mobile)

Expo SDK 54 + Expo Router + TypeScript skeleton. Not yet wired to Supabase. Configured for the monorepo via `metro.config.js` (extends Expo's default config and adds the workspace root to `watchFolders` so Metro picks up changes in `@eventer/shared`).

- Bundle id (iOS) and package (Android): `app.eventer.mobile`
- URL scheme: `eventer://`
- Slug: `eventer`

## Vercel

Vercel project root must point to `apps/web/` (not the repo root) after the monorepo migration.
