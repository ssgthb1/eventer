# Eventer

Full-stack party/event organizer with expense splitting, task management, RSVP, and budget tracking.

## Layout

This is an npm-workspaces monorepo:

```
apps/
  web/        # Next.js 16 App Router (deployed to Vercel)
  mobile/     # Expo Router skeleton (Phase 0 — no behavior yet)
packages/
  shared/     # Shared TS source (extracted lazily as mobile needs it)
supabase/     # SQL migrations
```

## Quick start

```bash
npm install               # Install all workspace deps from the repo root
npm run dev               # Start the web app (localhost:3000)
npm run dev:mobile        # Start the Expo dev server
```

## Other root scripts

```bash
npm run build             # Build apps/web
npm run lint              # Lint apps/web
npm run test              # Run vitest across all workspaces
npm run type-check        # tsc --noEmit on apps/web
```

For Expo health check: `cd apps/mobile && npx expo-doctor`.

## Web environment variables

Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `NEXT_PUBLIC_APP_URL`

## Mobile

- Bundle id / Android package: `app.eventer.mobile`
- URL scheme: `eventer://`
- Slug: `eventer`

Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` and fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

(Same Supabase project as the web app — RLS enforces access via the anon key.)

Supabase dashboard must list `eventer://auth/callback` under Auth → URL Configuration → Redirect URLs for sign-in to return to the app.

## Deploy

Web app deploys to Vercel. After the monorepo migration, set the Vercel project root to `apps/web/`.
