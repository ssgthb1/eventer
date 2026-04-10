# Eventer — Progress & Design Decisions

## Project Overview
Full-stack party/event organizer with expense splitting, task management, RSVP, and budget tracking.
- Repo: https://github.com/ssgthb1/eventer
- Stack: Next.js 16 App Router + TypeScript, Tailwind CSS, Supabase, Resend, Twilio, Vercel

---

## Design Decisions

### 2026-04-02 — Initial Setup

**Framework: Next.js 16 App Router**
- SSR + API routes in one codebase, native Vercel deployment.
- Uses `src/proxy.ts` (Next.js 16 convention) instead of deprecated `middleware.ts`.

**Database: Supabase Postgres + RLS**
- Every table checks `auth.uid()` against event participation rather than relying solely on application-level guards.
- Service-role client used only for operations that must bypass RLS with verified identity (invitation acceptance).

**Expense splitting algorithm: Greedy minimize-transactions**
- Net balance = Σ(paid) − Σ(owed) via credit/debit model that excludes settled splits correctly.
- Greedily matches largest debtor with largest creditor to minimize transaction count.
- Supports equal split (integer-cent arithmetic) and custom per-person amounts.

**Task board: 3-column kanban (open / in_progress / done)**
- Any participant can create, edit, assign, and move tasks.
- Self-assignment and peer assignment open to all event members.

**Role hierarchy: super_admin > admin > user**
- Stored in `profiles.role`. Per-event role stored in `event_participants.role` (organizer | participant).

**Invitation flow:**
- Token-based (random hex). Email via Resend, SMS via Twilio.
- Public `/invite/[token]` page; redirects unauthenticated users to login with `?next` callback.
- Token never returned to the inviter; rate-limited to 20/hour per organizer per event.

---

## Progress Log

### 2026-04-02 to 2026-04-10 — All Issues Complete

- [x] Issue #6 — Supabase schema + RLS (merged PR #19)
- [x] Issue #7 — Login page + Google OAuth callback + proxy middleware (merged PR #20)
- [x] Issue #8 — Middleware & role-based route protection (covered by proxy.ts in #7, closed)
- [x] Issue #9 — Admin & super-admin pages with role management (merged PR #21)
- [x] Issue #10 — AppShell, Sidebar, TopNav app layout (merged PR #22)
- [x] Issue #11 — Event CRUD: API routes, form, list/detail/edit pages (merged PR #23)
- [x] Issue #12 — Dashboard: stats, upcoming events, balance widget (merged PR #24)
- [x] Issue #13 — Participants management & RSVP (merged PR #25)
- [x] Issue #14 — Invitations via Resend (email) + Twilio (SMS) (merged PR #26)
- [x] Issue #15 — Expense logging: API routes, ExpenseForm, ExpenseList (merged PR #27)
- [x] Issue #16 — Expense calculator, BalanceSummary, SettleButton (merged PR #28)
- [x] Issue #17 — Task board: kanban, assign, due dates (merged PR #29)
- [x] Issue #18 — Budget tracker widget & event overview polish (merged PR #30)

### All epics complete. App is fully built and deployed.
