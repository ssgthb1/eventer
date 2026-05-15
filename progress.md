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

---

### 2026-05-11 — Web UI Phase C: hero + cards + event-detail restructure (Issue #40, PR forthcoming)

**Scope:** screen-level polish on top of the Phase A+B primitive groundwork.

**Dashboard (`/dashboard`)**
- Plain greeting row → gradient hero card (indigo-50 → white) with a soft blurred indigo accent in the corner. H1 typography bumped to `text-3xl` at sm+ breakpoints. The "New event" CTA stays in the hero at `size="lg"`.
- StatCard redesigned: now carries an icon + accent variant (`brand`/`info`/`warning`/`neutral`). "Total events" uses `CalendarDays` (brand/indigo), "Upcoming" uses `Calendar` (info/blue), "You owe" uses `TrendingDown` and shifts to `warning` (amber, not red — unsettled balances are caution not error) when > 0, with a subtitle of "Unsettled across events" / "All settled up".
- Upcoming event rows: title now hovers indigo and gets a MapPin icon next to the location.
- StatCards without `href` render as plain `<div>` (not `<Link>`) to avoid signaling navigation the user can't act on — addressed in code review.

**Events list (`/events`)**
- Grid card redesign: gradient date strip across the top with a stacked `MMM`/`day` chip + weekday + time, plus the status Badge. Body has a 2-line truncated name (hovers indigo), 2-line description, and MapPin/Wallet icons on metadata. Hover lift via `hover:-translate-y-0.5`. Budget now uses `formatCurrency`.
- Cards without a date show a "No date set" affordance with a Calendar icon.

**Event detail (`/events/[id]`)**
- `BackButton` moved to the top of the page (above the H1), following the breadcrumb convention.
- The bottom action button row (Participants/Expenses/Tasks/Back) that landed in Phase B was redundant with the stat tiles — both navigated to the same three subpages. Removed the bottom row entirely and gave the stat tiles a clearer affordance: icon + accent + chevron-right that slides on hover. Each tile carries its own accent (brand/success/info).
- Location pulled into the page header next to the date with a MapPin icon.

**Misc**
- `IconButton` `danger` variant resting colour: `text-slate-400` → `text-red-400` (reviewer's affordance concern from Phase B fixed).
- Events list grid cards: replaced an invalid `<dl>` (missing `<dt>`/`<dd>` semantics) with a plain `<div>` after code review flagged it.

**Carve-outs (not in this PR):** mobile (no feature screens exist yet — token alignment lands with Phase 2), web login page (already has a decent branded gradient backdrop), pre-existing master lint errors.

**Verification:** type-check clean; 35 web + 19 mobile tests pass; reviewer found 1 HIGH (semantic `<dl>`) and 1 MEDIUM (non-navigable "You owe" tile rendering with hover-lift) — both fixed pre-merge.

---

### 2026-05-12 — Phase 1.5: word-of-mouth invites (Issue #42, PR forthcoming)

**Goal:** ship the web app to the public without Resend (email) or Twilio (SMS) configured. Organizers add participants manually; auto-link happens on first sign-in.

**SQL — `supabase/migrations/001_phase_1_5_auto_link_participants.sql` (new, idempotent):**
- Extended `handle_new_user()` trigger to also populate `profiles.phone` from `auth.users.phone`, then UPDATE placeholder `event_participants` rows whose email/phone matches the new user. Uses `DISTINCT ON (event_id)` to claim one per event (avoids violating `unique(event_id, user_id)` when both an email-only and a phone-only placeholder match). Subsequent DELETE cleans up unclaimed duplicate placeholders.
- **Phone matching normalizes both sides via `regexp_replace(phone, '\D', '', 'g')`** so an organizer typing `"+1 (415) 555-0100"` matches Supabase's E.164 `"+14155550100"`. (Reviewer caught this — string-equality match would have failed in nearly every real-world case.)
- Email matching is `lower(...)` on both sides.
- Functional indexes added: `idx_ep_email_lower`, `idx_ep_phone_digits`, and a unique functional index `ux_ep_event_phone_digits (event_id, normalized_phone) where phone is not null` so the same phone can't be added twice to one event. The API's 409 handler covers this via PostgreSQL error code 23505.
- One-time backfill at the bottom retroactively links existing placeholders to existing auth users.

**Note:** Google OAuth does not typically populate `auth.users.phone`. The phone-match branch only fires for auth methods that do (SMS OTP). Email match is the path that actually fires for the current Google-only login.

**Web changes:**
- `AddParticipantForm` — adds a `phone` input (DB column already existed), help text explaining the auto-link behavior, success message.
- `POST /api/events/[id]/participants` — accepts `phone` with simple format validation (≥ 7 digits, allowed chars `[\d+()\-\s.]`), updated 409 message to mention phone.
- `ParticipantsList` — placeholder rows get an amber "Awaiting sign-in" badge. Email or phone shows as a subtitle on unlinked rows.
- `participants/page.tsx` — `<InviteForm>` gated behind `process.env.INVITES_ENABLED === 'true'` (server-side check; defaults off). Re-enable without code by setting the env var + Resend/Twilio secrets in production.
- `ShareEventButton` — new client component on event detail page header. Copies the event URL to clipboard via `navigator.clipboard` with a hidden-textarea / `execCommand` fallback for insecure contexts. Visible to everyone (not just organizers) so anyone can pass a link around. Anyone who logs in with a matching email/phone gets auto-joined via the trigger.
- `.env.local.example` — Resend/Twilio sections now marked OPTIONAL with empty defaults. New `INVITES_ENABLED=false` documented.

**Carve-outs (kept in tree for revival):** Resend/Twilio code in `lib/notifications.ts`, the `/api/invitations/*` routes, the `<InviteForm>` component. Lazy-initialized clients mean unset env vars don't crash startup. To turn it all back on later: set `RESEND_API_KEY`, `TWILIO_*`, `INVITES_ENABLED=true` in Vercel envs.

**Verification:** type-check clean; 37 web + 19 mobile tests pass (2 new for `ShareEventButton`). Reviewer found 3 HIGH issues — phone normalization mismatch, missing `unique(event_id, phone)`, undocumented `INVITES_ENABLED` — all fixed pre-merge.

**Manual ops step:** apply `supabase/migrations/001_phase_1_5_auto_link_participants.sql` to the production Supabase project via the SQL Editor. — ✅ Applied 2026-05-15.

---

### 2026-05-15 — Phase 2.1: shared extraction + mobile Events list/detail (Issue #48, sub-issue of #45)

**Goal:** first vertical slice of Phase 2 (#45 — port feature screens to Expo). Establishes the shared-logic + screen patterns every later sub-issue reuses. The app previously had only login + a placeholder home tab (Apple 4.2 auto-reject risk).

**Shared package (`packages/shared/`):**
- `src/expense-calculator.ts` — the greedy balance/settlement algorithm, moved verbatim from `apps/web`. Now the single source of truth.
- `src/types.ts` — domain model (Event, EventParticipant, Expense, ExpenseSplit, Task, Profile + enums + enriched joins) mirroring the Supabase schema, so web and mobile type queries against one definition.
- `src/index.ts` re-exports both. Added own vitest (`test` script + `vitest.config.ts`, node env) — the calculator test suite moved here (web suite 37→30, shared 0→8; one extra test added by the test agent covering the `displayName` fallback chain).
- `apps/web/src/lib/expense-calculator.ts` is now a thin re-export of `@eventer/shared` (existing `@/lib/expense-calculator` imports unchanged). `@eventer/shared` declared as an explicit `*` dependency in both `apps/web` and `apps/mobile` (was relying on workspace hoisting — reviewer HIGH, fixed pre-merge).

**Mobile (`apps/mobile/`):**
- `lib/theme.ts` — light-only design tokens (indigo/slate palette mirroring web Tailwind usage; dark mode deferred since web is light-only). `lib/format.ts` (currency/date/initials, node-safe) and `lib/event-presenters.ts` (status accent, budget view, task progress, pluralize) — both pure, unit-tested (mobile suite 19→42).
- `components/ui/` RN primitives: `Screen`, `Card`, `Badge`, `StatTile`, `LoadingState`/`ErrorState`/`EmptyState`.
- `lib/events.ts` — Supabase data access (RLS-scoped; no web API dependency). `listEvents` narrowed to needed columns + `.limit(200)`; `getEventDetail` parallel queries with `.limit(500)` on expenses + tasks; Supabase error detail logged, generic message surfaced to UI (reviewer MEDIUM, fixed).
- Tab restructure: **Home / Events / Profile** (deleted template `explore.tsx` + `modal.tsx`; root layout adds `events/[id]` stack route). Home = greeting hero + total/upcoming stats + CTA. Events = `FlatList` with pull-to-refresh + loading/error/empty states. Profile = identity + sign-out (moved off Home). Event detail (`events/[id]`) = header, status badge, date/location, stat tiles, budget bar, task progress, details — read-only. `useLocalSearchParams` `id` narrowed against `string[]` (reviewer HIGH, fixed).

**Carve-outs (later #45 sub-issues):** participants/RSVP, expenses/balance/settle, task board, create/edit + add flows. Stat tiles intentionally non-navigable (sub-screens don't exist yet). Home + Events double-fetch `listEvents` on mount (no shared cache) — acceptable for this slice; revisit with a data layer when more screens land. Dark mode (web is light-only); app icons (Phase 3). RN component render tests not set up — coverage is on the pure helpers only.

**Verification:** type-check clean across all 3 workspaces; 30 web + 42 mobile + 8 shared tests pass. Pre-existing master lint errors (apostrophes / hooks-rules in admin/super-admin/BalanceSummary) unchanged — no new lint introduced. Reviewer found 3 HIGH (missing `@eventer/shared` dep ×2, unguarded route param) + MEDIUM (error leakage, unbounded queries) — all fixed pre-merge.

---

### 2026-05-15 — Phase 2.2: Participants screen + RSVP self-action (Issue #50, sub-issue of #45)

**Goal:** second Phase 2 slice — read participants + let the signed-in user set their own RSVP. Mirrors the web `ParticipantsList`/`RSVPButton` (read + RSVP self path only).

**Data access (`apps/mobile/lib/participants.ts`):**
- `listParticipants(eventId)` — joined `profiles(full_name, avatar_url)`, ordered by `joined_at`, `.limit(500)` (consistent with `events.ts`; reviewer MEDIUM). The `profiles` join is typed as an array and accessed `?.[0]?.` — deliberately mirrors the production-proven web `ParticipantsList` (PostgREST returns an array for this embed since there's no detected FK constraint).
- `setRsvp(participantId, status)` — `status` typed `Exclude<RsvpStatus,'pending'>`; RLS permits only self-update (same guarantee the web `/rsvp` route enforces in app code). Errors logged, generic message surfaced.

**Presenters (`lib/event-presenters.ts`, unit-tested):** `rsvpPresenter` (label + accent), `RSVP_CHOICES`, `participantName` (profile→display_name→email→phone→"Unknown", `||` so empty strings fall through). `theme.ts` gained a `danger` accent for the "Can't go" state.

**UI:**
- `components/rsvp-control.tsx` — segmented Going/Maybe/Can't-go. Optimistic with rollback; in-flight guard via `useRef` (not stale `pending` state) and rollback targets a `confirmedRef` (last server-confirmed value, not the possibly-optimistic prop) — both reviewer HIGH/MEDIUM fixes.
- `components/participant-row.tsx` — avatar (expo-image) / initials fallback, name, organizer + "Awaiting sign-in" badges, "(you)"; own row shows the RSVP control, others show a status badge.
- `app/events/[id]/participants.tsx` — FlatList + pull-to-refresh + loading/error/empty; optimistic RSVP changes patched into local list state.
- **Route restructure:** `app/events/[id].tsx` → `app/events/[id]/index.tsx`; added `participants.tsx`. Root `_layout.tsx` no longer hard-registers the `events/[id]/*` screens — they auto-register from the filesystem and set their own header title in-component (avoids the Expo Router index-route naming pitfall; reviewer HIGH). `StatTile` gained an optional `href` — the event-detail **Participants** tile is now navigable; expenses/tasks tiles stay static (their screens are later sub-issues).

**Carve-outs (later #45 sub-issues):** organizer add/remove participant, invites UI, expenses/balance/settle, task board, create/edit event. RN component render tests still not set up — coverage is on pure helpers.

**Verification:** type-check clean (all 3 workspaces); 30 web + 49 mobile + 8 shared tests pass (test agent added a `participantName([] profiles)` edge case). No new lint. Reviewer found 2 HIGH (stale-closure RSVP guard, Expo Router index-route registration) + 3 MEDIUM (optimistic rollback target, unbounded `listParticipants`, `profiles` shape — last confirmed correct vs. web precedent) — all addressed pre-merge.

**Phase 1.5 migration applied to production Supabase on 2026-05-15.**
