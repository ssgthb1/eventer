# Eventer — Progress & Design Decisions

## Project Overview
Full-stack party/event organizer with expense splitting, task management, RSVP, and budget tracking.
- Repo: https://github.com/ssgthb1/eventer
- Stack: Next.js 14 App Router + TypeScript, Tailwind CSS + shadcn/ui, Supabase, Resend, Twilio, Vercel

---

## Design Decisions

### 2026-04-02 — Initial Setup

**Framework: Next.js 14 App Router**
- Chosen over Remix/Vite because it supports both SSR and API routes in one codebase, native Vercel deployment, and the shadcn/ui ecosystem is built for it.

**UI: Tailwind CSS + shadcn/ui**
- shadcn gives accessible, composable components without a runtime library. Not a dependency — components are copied into `/src/components/ui/`.

**Database: Supabase Postgres + RLS**
- Free tier with 500MB, built-in auth, real-time, and Row Level Security. Avoids needing a separate auth service.
- RLS strategy: every table checks `auth.uid()` against event participation rather than relying solely on application-level guards.

**Expense splitting algorithm: Greedy minimize-transactions**
- Compute net balance per person (paid - owed).
- Greedily match largest debtor with largest creditor.
- Produces fewest possible payment transactions.
- Supports both equal split and custom per-person amounts.

**Task board: 3-column kanban (open / in_progress / done)**
- Both organizers and participants can create, edit, assign, and delete tasks.
- Self-assignment flow: any participant can pick up an unassigned task.
- Organizer can forcibly reassign.

**Role hierarchy: super_admin > admin > user**
- Stored in `profiles.role` column.
- First super_admin seeded manually via Supabase SQL editor.
- Role checked both in `middleware.ts` (route guard) and RLS policies.

**Invitation flow:**
- Token-based invite (random 32-byte hex stored in `invitations` table).
- Email sent via Resend, SMS via Twilio.
- Public `/invite/[token]` page — no auth required to view.
- If not logged in, redirected to login with `?next=/invite/[token]` callback.

---

## Progress Log

### 2026-04-02
- [x] Next.js 14 project initialized with TypeScript, Tailwind, App Router
- [x] shadcn/ui configured (components.json)
- [x] Core dependencies installed (Supabase, Resend, Twilio, Radix UI, lucide-react)
- [x] GitHub repo created: https://github.com/ssgthb1/eventer
- [x] 5 epic issues created (#1–#5)
- [x] 13 child issues created (#6–#18)
- [x] todo.md and progress.md initialized
- [x] Issue #6 — Supabase schema + RLS (merged PR #19)
- [x] Issue #7 — Login page + OAuth callback + proxy middleware (merged PR #20)
- [x] Issue #8 — Middleware & role-based route protection (covered by proxy.ts in #7, closed)
- [x] Issue #9 — Admin & super-admin pages with role management (merged PR #21)
- [ ] Issue #7 — Login page + OAuth callback
- [ ] Issue #8 — Middleware + role protection
- [ ] Issue #9 — Admin pages
- [ ] Issue #10 — App layout
- [ ] Issue #11 — Event CRUD
- [ ] Issue #12 — Dashboard
- [ ] Issue #13 — Participants + RSVP
- [ ] Issue #14 — Invitations
- [ ] Issue #15 — Expense logging
- [ ] Issue #16 — Balance/settlement UI
- [ ] Issue #17 — Task board
- [ ] Issue #18 — Budget tracker
