# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check (tsc --noEmit)
npx vitest           # Run tests (once vitest is added)
npx vitest run src/lib/expense-calculator.test.ts  # Run single test file
```

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

## Architecture

### Route Groups
- `src/app/(auth)/` — public auth pages (login, callback)
- `src/app/(app)/` — authenticated app pages; layout.tsx enforces auth
- `src/app/admin/` — requires `admin` or `super_admin` role
- `src/app/super-admin/` — requires `super_admin` role
- `src/app/invite/[token]/` — public invite acceptance (no auth required)
- `src/app/api/` — all API routes (co-located under app/)

### Key Libraries
- `src/lib/supabase/client.ts` — browser Supabase client (use in Client Components)
- `src/lib/supabase/server.ts` — server Supabase client using cookies (use in Server Components / Route Handlers)
- `src/lib/expense-calculator.ts` — greedy minimize-transactions algorithm
- `src/lib/notifications.ts` — Resend (email) + Twilio (SMS) helpers
- `src/proxy.ts` — auth guard + role enforcement on every request (Next.js 16 proxy convention)

### Data Model (Supabase)
Tables: `profiles`, `events`, `event_participants`, `invitations`, `expenses`, `expense_splits`, `tasks`

- `profiles.role` — `user | admin | super_admin`
- `event_participants.role` — `organizer | participant` (per-event role)
- All tables have RLS enabled. Access based on `auth.uid()` and event participation.

### Expense Splitting Algorithm
Net balance = Σ(paid) − Σ(owed). Greedy matching of largest debtor ↔ largest creditor minimizes transaction count. Supports `equal` and `custom` split types.

### Environment Variables
See `.env.local.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `NEXT_PUBLIC_APP_URL`.
