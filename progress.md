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

---

### 2026-05-04 — Phase 0 mobile bootstrap (Issue #32)

**Monorepo restructure (npm workspaces) + Expo skeleton (merged PR #33)**

- Web app moved from repo root to `apps/web/` (renamed `@eventer/web`); no behavior changes.
- `packages/shared/` placeholder package (`@eventer/shared`) added; raw-TS source, transpiled by both Next.js (`transpilePackages`) and Metro.
- `apps/mobile/` Expo SDK 54 skeleton (Expo Router + TS): bundle id `app.eventer.mobile`, scheme `eventer://`, slug `eventer`. `metro.config.js` extends Expo defaults and adds workspace root to `watchFolders`.
- Root `package.json`: workspaces (`apps/*`, `packages/*`), scripts (`dev:web`, `dev:mobile`, `build`, `lint`, `test`, `type-check`), `overrides` pinning `react`/`react-dom` to `19.2.4` for cross-workspace dedupe (mobile uses `expo.install.exclude` to acknowledge the override).
- `.gitignore` anchored `/ios/` and `/android/` to root so `expo prebuild` can land mobile native dirs in a future phase.
- Vercel project root must be reset from repo root → `apps/web/` post-merge (manual dashboard step).

**Out of scope for Phase 0** (deferred to Phase 1+): mobile Supabase wiring, auth/deep links/screens, lazy extraction of shared types and `expense-calculator` into `@eventer/shared`.

---

### 2026-05-10 — Phase 1 mobile auth (Issue #34)

**Supabase PKCE + Google OAuth in `apps/mobile` (merged PR #35)**

- `apps/mobile/lib/supabase.ts` — Supabase client using `expo-secure-store` as the PKCE auth storage adapter (tokens never touch AsyncStorage). Throws on missing `EXPO_PUBLIC_SUPABASE_*`.
- `apps/mobile/lib/auth.tsx` — `AuthProvider` + `useAuth` hook. `signInWithGoogle` uses `expo-auth-session` + `WebBrowser.openAuthSessionAsync` + `supabase.auth.exchangeCodeForSession`. `onAuthStateChange` is the single source of truth for the `loaded` flag, so a `getSession` failure can't strand the app on a spinner.
- `apps/mobile/lib/auth-state.ts` — pure state machine (`loading | signedOut | signedIn`) extracted for vitest.
- `app/login.tsx`, `app/(tabs)/_layout.tsx` (auth gate), `app/(tabs)/index.tsx` (placeholder home), `app/_layout.tsx` (wraps Stack in AuthProvider).
- Root `test` and `type-check` now run across all workspaces via `--workspaces --if-present`; targeted variants exposed.
- `.gitignore` updated to allow `.env.example` / `.env.local.example` through `.env*` (fixed a Phase 0 oversight; `apps/web/.env.local.example` is now tracked).
- Manual step: add `eventer://auth/callback` to Supabase Auth → URL Configuration → Redirect URLs (in dashboard).

**Out of scope for Phase 1** (deferred): Universal/App Links → Phase 4; data screens → Phase 2; UI kit decision → Phase 2; push tokens → Phase 3.

---

### 2026-05-11 — Phase 1 stabilization (Issue #36)

**On-device smoke testing PR #35 surfaced three independent bugs (all in this fix).**

- **Mobile failed to boot — missing `apps/mobile/babel.config.js`.** Without it `babel-preset-expo` did not inline `EXPO_ROUTER_APP_ROOT` and Metro crashed on `require.context`. Added the file with `babel-preset-expo` + an explicit registration of `expo-router-plugin` (needed because the preset is hoisted to the workspace root but `expo-router` stays under `apps/mobile/node_modules`).
- **React renderer version skew.** Phase 0 added a root `overrides` block forcing `react`/`react-dom` to `19.2.4` to silence an `expo-doctor` duplicate-React warning. RN 0.81.5 is compiled against 19.1.0 and asserts renderer version at runtime — mobile crashed on boot. Removed the override, pinned mobile to `19.1.0`, removed `expo.install.exclude`. Web keeps its own local `19.2.4`. (Never run `expo install` in `apps/mobile` without `--fix-dependencies=false` — it will rewrite the pin.)
- **Session not persisting across cold starts.** iOS Keychain caps each item at ~2048 bytes; Supabase session JSON exceeds that, so the naive SecureStore adapter silently dropped writes. Replaced with `LargeSecureStoreAdapter` (chunks values into 400-char pieces under `${key}__N` with a `${key}__meta` count). Writes are crash-safe via a `pending` sentinel — a kill mid-write makes `getItem` return null on next read rather than torn data. Unit-tested in `lib/supabase.test.ts`.
- **Defensive Linking-based callback recovery** in `auth.tsx`: runs `exchangeCodeForSession` if the OAuth callback URL arrives as a deep link instead of via `WebBrowser.openAuthSessionAsync`'s return value. Skips exchange when the URL carries `?error=`.

**Documented limitation:** OAuth does **not** complete in Expo Go. The `exp://<lan-ip>:8081/--/auth/callback?code=…` redirect causes Expo Go to reload the bundle, and `Linking.getInitialURL()` after the reload strips everything after the bundle host — there is no JS-level path to recover the code. Standalone builds use `eventer://` (the app's own scheme) and work cleanly. To smoke-test before standalone, use an EAS dev build.

---

### 2026-05-11 — Web UI design system + textual-link removal (Issue #38, PR forthcoming)

**User complaint:** event detail page's bottom row was textual `← Back / Participants → / Expenses → / Tasks →` links. Same pattern repeated across most screens. Modernization Phase A + B.

**Phase A — primitives under `apps/web/src/components/ui/`:**
- `Button` (variants: `primary`, `secondary`, `ghost`, `danger`, `dangerOutline`, `dangerGhost`, `success`; sizes `xs`/`sm`/`md`/`lg`; `leftIcon`/`rightIcon`/`loading`/`loadingText`/`fullWidth`).
- `LinkButton` — same styles as `Button`, renders `next/link`. Shared `buttonStyles` cva.
- `IconButton` — square icon-only with required `aria-label`. Variants `primary`/`secondary`/`ghost`/`danger`.
- `Badge` — pill variants with optional status `withDot`.
- `BackButton` — pre-styled `LinkButton` with `ArrowLeft` icon.
- `EmptyState` — icon + title + description + action slot, replaces the bespoke "No X yet" cards.
- `Card` — shared white/slate-200/rounded-xl shell (introduced; gradual adoption deferred).
- `globals.css` body font switched from Arial → Geist (the variable was loaded by Next/font but never applied). Added `cv11`/`ss01` features for Geist disambiguation glyphs.

**Phase B — applied across 13 files:**
- Event detail (`/events/[id]`): the four textual nav links became `<LinkButton>` with icons (`Users`, `DollarSign`, `CheckSquare`, `ArrowLeft`-Back). Status pill → `<Badge withDot>`. Edit link → `<LinkButton>` with `Pencil`. Tasks widget "View all →" → `<LinkButton variant="ghost">`.
- Sub-pages (expenses/participants/tasks): top "← {event.name}" textual link → `<BackButton>`.
- Dashboard + events list: "+ New event" header + empty-state CTAs → real `<Button>`. Empty states now use the shared `<EmptyState>` component.
- All form actions (`EventForm`, `ExpenseForm`, `TaskForm`, `InviteForm`, `AddParticipantForm`, `AcceptInviteButton`) migrated to `<Button>` — same look, but consistent loading/disabled handling. `Button` enforces `disabled || loading` internally so per-call-site logic simplified.
- `TaskBoard` per-card buttons: `← →` status moves became `<IconButton aria-label>`, "Edit" / "Assign to me" / "Unassign" / "Yes" / "No" became compact ghost `<Button size="xs">` with icons. "Delete" trash → `<IconButton variant="danger" aria-label>`.
- `ExpenseList`: "+ Add expense", per-card Edit/Delete, confirm-delete prompts → `<Button>` / `dangerGhost` Button.
- `SettleButton` (was entirely textual `text-indigo-500 hover:underline`) → success/secondary/ghost `<Button size="xs">`.
- `DeleteEventButton`, `ParticipantsList` remove icon → `<Button>` / `<IconButton>`.

**Carve-outs:** Large clickable card tiles (event detail stat cards, events grid items, dashboard upcoming event rows) stayed as `<Link>` — they aren't textual links, they're tappable surfaces. Segmented controls (`RSVPButton`, channel toggle, split-type toggle, status toggle) stayed as ad-hoc styled buttons since they aren't single-action buttons.

**Out of scope for this PR** (Phase C/D follow-ups): screen-level polish (gradients, hero cards), mobile UI redesign (no feature screens exist yet — token alignment will land with Phase 2), kanban danger-icon resting affordance, pre-existing lint errors on master (apostrophes, hooks-rules in admin/super-admin/BalanceSummary).

**Verification:** type-check clean across all workspaces; web suite 35 tests pass (9 new for Button + 9 for primitives); mobile suite 19 tests pass. Code review identified one HIGH (missing `dangerGhost` variant) — fixed pre-merge.
