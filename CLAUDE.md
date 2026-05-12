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
npm run test              # Run vitest across all workspaces (web + mobile)
npm run test:web          # Run only the apps/web suite
npm run test:mobile       # Run only the apps/mobile suite
npm run type-check        # tsc --noEmit across all workspaces
npm run type-check:web    # tsc --noEmit on apps/web only
npm run type-check:mobile # tsc --noEmit on apps/mobile only
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

Expo SDK 54 + Expo Router + TypeScript. Configured for the monorepo via `metro.config.js` (extends Expo's default config and adds the workspace root to `watchFolders` so Metro picks up changes in `@eventer/shared`).

- Bundle id (iOS) and package (Android): `app.eventer.mobile`
- URL scheme: `eventer://`
- Slug: `eventer`

### Auth (Phase 1)

- `apps/mobile/lib/supabase.ts` — Supabase client using `expo-secure-store` as the PKCE auth storage adapter. The adapter (`LargeSecureStoreAdapter`) chunks values into 400-char pieces under `${key}__N` with a `${key}__meta` count, because the iOS Keychain caps single items at ~2048 bytes and the Supabase session JSON routinely exceeds that. Unit-tested in `lib/supabase.test.ts`.
- `apps/mobile/lib/auth.tsx` — `AuthProvider` + `useAuth` hook. Wraps the Expo Router tree in `app/_layout.tsx`. Subscribes to `Linking` (both `getInitialURL` and `'url'` events) and runs `exchangeCodeForSession` if the URL carries a `?code=…` — defensive recovery for any path where the callback is delivered as a deep link instead of via the `WebBrowser.openAuthSessionAsync` return value.
- `apps/mobile/lib/auth-state.ts` — pure state machine (`deriveAuthState`, `shouldRedirectToLogin`, `shouldRedirectToHome`), unit-tested with vitest.
- `app/login.tsx` — Sign in with Google screen. Uses `expo-auth-session` + `WebBrowser.openAuthSessionAsync` for the PKCE flow; exchanges the returned code via `supabase.auth.exchangeCodeForSession`.
- `app/(tabs)/_layout.tsx` — auth gate; redirects to `/login` when `signedOut`.
- `apps/mobile/babel.config.js` — required for `expo-router`. Without it `process.env.EXPO_ROUTER_APP_ROOT` is never inlined and Metro errors on `require.context`. Explicitly registers `expo-router-plugin` because `babel-preset-expo` is hoisted to the workspace root but `expo-router` stays under `apps/mobile/node_modules`, so the preset's `hasModule('expo-router')` check fails.
- Required env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `apps/mobile/.env.example`).
- Supabase dashboard manual step: add `eventer://auth/callback` to Auth → URL Configuration → Redirect URLs.

React version pin: mobile pins `react`/`react-dom` to `19.1.0` (no root `overrides`). React Native 0.81.5 is compiled against React 19.1.0 and asserts the renderer matches at runtime — newer Reacts crash the app on boot. Web pins its own `19.2.4` in `apps/web/package.json` and resolves it locally; do not add a root override that forces the mobile app off `19.1.0`. **Do not run `npx expo install` (or `expo install <pkg>`) in `apps/mobile` without `--fix-dependencies=false`** — it silently rewrites `react` and `react-dom` to Expo SDK's peer-recommended versions and undoes the pin.

Universal Links / App Links are not configured yet — Phase 1 relies on the `eventer://` custom scheme only. App Links / Universal Links are deferred to Phase 4 (beta + store submission).

### Mobile auth does NOT work end-to-end in Expo Go

OAuth in Expo Go redirects to `exp://<lan-ip>:8081/--/auth/callback?code=…`. Expo Go interprets that scheme as "reload the project bundle," which destroys the in-flight `WebBrowser.openAuthSessionAsync` promise mid-flow, and `Linking.getInitialURL()` after the reload returns only `exp://<lan-ip>:8081` — the `/--/auth/callback?code=…` portion is stripped, so we cannot recover the code. This is an Expo Go limitation, not a bug in our code.

The Phase 1 target is the standalone build, where `eventer://` is the app's own scheme: no bundle reload, `ASWebAuthenticationSession` captures the callback URL cleanly, the exchange completes, and the chunked SecureStore persists the session across launches. To smoke-test mobile auth end-to-end before standalone build, use an EAS dev build (`eas build --profile development`) — `npx expo start` against the dev build behaves like a standalone build for URL scheme handling.

## Vercel

Vercel project root must point to `apps/web/` (not the repo root) after the monorepo migration.
