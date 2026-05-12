-- ============================================================
-- Eventer Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────
-- Profiles (extends auth.users)
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  full_name  text,
  avatar_url text,
  phone      text,
  role       text not null default 'user'
               check (role in ('super_admin', 'admin', 'user')),
  created_at timestamptz default now()
);

-- Auto-create profile on new user signup, and auto-link any placeholder
-- event_participants rows that an organizer pre-created with this user's
-- email or phone (Phase 1.5 word-of-mouth invite flow).
-- search_path pinned to prevent search path injection attacks.
--
-- Phone matching strips non-digits on both sides so a placeholder stored
-- as "+1 (415) 555-0100" matches an auth.users.phone of "+14155550100".
-- Email matching is case-insensitive.
--
-- Note: Google OAuth typically does not populate auth.users.phone — the
-- phone branch only fires for auth methods that do (SMS OTP, etc.).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  new_phone_digits text := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');
begin
  insert into public.profiles (id, full_name, avatar_url, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  )
  on conflict (id) do nothing;

  -- Claim placeholder participants. For each event, claim at most one
  -- placeholder (oldest joined_at) to avoid violating unique(event_id, user_id)
  -- if both an email-only and a phone-only placeholder happen to match.
  update public.event_participants
     set user_id = new.id
   where id in (
     select distinct on (ep.event_id) ep.id
       from public.event_participants ep
      where ep.user_id is null
        and (
          (new.email is not null and lower(ep.email) = lower(new.email))
          or (
            new_phone_digits is not null
            and nullif(regexp_replace(coalesce(ep.phone, ''), '\D', '', 'g'), '') = new_phone_digits
          )
        )
      order by ep.event_id, ep.joined_at asc
   );

  -- Remove leftover placeholder duplicates so the same person is not listed twice.
  -- Safe because the UPDATE above has already set user_id on the canonical row;
  -- this only deletes still-unclaimed duplicate placeholders.
  delete from public.event_participants
   where user_id is null
     and (
       (new.email is not null and lower(email) = lower(new.email))
       or (
         new_phone_digits is not null
         and nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') = new_phone_digits
       )
     );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────
-- Events
-- ─────────────────────────────────────────
create table if not exists public.events (
  id           uuid default gen_random_uuid() primary key,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  description  text,
  date         timestamptz,
  location     text,
  venue_notes  text,
  budget       decimal(10,2) check (budget >= 0),
  status       text not null default 'active'
                 check (status in ('draft', 'active', 'completed')),
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- Event Participants
-- ─────────────────────────────────────────
create table if not exists public.event_participants (
  id            uuid default gen_random_uuid() primary key,
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  email         text,
  phone         text,
  display_name  text,
  role          text not null default 'participant'
                  check (role in ('organizer', 'participant')),
  rsvp_status   text not null default 'pending'
                  check (rsvp_status in ('pending', 'yes', 'no', 'maybe')),
  joined_at     timestamptz default now(),
  unique(event_id, user_id),
  unique(event_id, email)
);

-- ─────────────────────────────────────────
-- Invitations
-- ─────────────────────────────────────────
create table if not exists public.invitations (
  id          uuid default gen_random_uuid() primary key,
  event_id    uuid not null references public.events(id) on delete cascade,
  invited_by  uuid not null references public.profiles(id),
  email       text,
  phone       text,
  token       text unique default encode(gen_random_bytes(32), 'hex'),
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz default now(),
  expires_at  timestamptz not null default now() + interval '7 days'
);

-- ─────────────────────────────────────────
-- Expenses
-- ─────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid default gen_random_uuid() primary key,
  event_id    uuid not null references public.events(id) on delete cascade,
  paid_by     uuid not null references public.profiles(id),
  amount      decimal(10,2) not null check (amount > 0),
  description text not null,
  split_type  text not null default 'equal'
                check (split_type in ('equal', 'custom')),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- Expense Splits (per-participant breakdown)
-- ─────────────────────────────────────────
create table if not exists public.expense_splits (
  id              uuid default gen_random_uuid() primary key,
  expense_id      uuid not null references public.expenses(id) on delete cascade,
  participant_id  uuid not null references public.event_participants(id) on delete cascade,
  amount_owed     decimal(10,2) not null check (amount_owed >= 0),
  is_settled      boolean not null default false,
  settled_at      timestamptz,
  unique(expense_id, participant_id)
);

-- ─────────────────────────────────────────
-- Tasks
-- ─────────────────────────────────────────
create table if not exists public.tasks (
  id           uuid default gen_random_uuid() primary key,
  event_id     uuid not null references public.events(id) on delete cascade,
  created_by   uuid not null references public.profiles(id),
  assigned_to  uuid references public.profiles(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'open'
                 check (status in ('open', 'in_progress', 'done')),
  due_date     date,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.events            enable row level security;
alter table public.event_participants enable row level security;
alter table public.invitations       enable row level security;
alter table public.expenses          enable row level security;
alter table public.expense_splits    enable row level security;
alter table public.tasks             enable row level security;

-- Helper: is user a participant (or organizer) of an event?
-- search_path pinned to prevent search path injection
create or replace function public.is_event_participant(p_event_id uuid)
returns boolean language sql security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_participants
    where event_id = p_event_id
      and user_id  = auth.uid()
  );
$$;

-- Helper: is user the organizer of an event?
create or replace function public.is_event_organizer(p_event_id uuid)
returns boolean language sql security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_participants
    where event_id = p_event_id
      and user_id  = auth.uid()
      and role     = 'organizer'
  );
$$;

-- ── profiles ──────────────────────────────
-- Scoped to: own profile, or co-participants in a shared event
-- Prevents exposing phone/PII of unrelated users
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.event_participants ep1
      join public.event_participants ep2 on ep1.event_id = ep2.event_id
      where ep1.user_id = auth.uid()
        and ep2.user_id = profiles.id
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ── events ────────────────────────────────
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select using (
    created_by = auth.uid()
    or public.is_event_participant(id)
  );

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert with check (created_by = auth.uid());

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events
  for update using (
    created_by = auth.uid()
    or public.is_event_organizer(id)
  );

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events
  for delete using (created_by = auth.uid());

-- ── event_participants ────────────────────
drop policy if exists "ep_select" on public.event_participants;
create policy "ep_select" on public.event_participants
  for select using (public.is_event_participant(event_id) or user_id = auth.uid());

drop policy if exists "ep_insert" on public.event_participants;
create policy "ep_insert" on public.event_participants
  for insert with check (
    -- event creator or existing organizer can add participants at any role
    exists (select 1 from public.events where id = event_id and created_by = auth.uid())
    or public.is_event_organizer(event_id)
    -- invitees can only add themselves as participant (never organizer)
    or (user_id = auth.uid() and role = 'participant')
  );

drop policy if exists "ep_update" on public.event_participants;
create policy "ep_update" on public.event_participants
  for update using (
    user_id = auth.uid()
    or public.is_event_organizer(event_id)
    or exists (select 1 from public.events where id = event_id and created_by = auth.uid())
  );

drop policy if exists "ep_delete" on public.event_participants;
create policy "ep_delete" on public.event_participants
  for delete using (
    user_id = auth.uid()
    or public.is_event_organizer(event_id)
    or exists (select 1 from public.events where id = event_id and created_by = auth.uid())
  );

-- ── invitations ───────────────────────────
-- Token-based acceptance is handled exclusively through a service-role
-- API route — the anon client never updates invitations directly.
drop policy if exists "inv_select" on public.invitations;
create policy "inv_select" on public.invitations
  for select using (
    invited_by = auth.uid()
    or public.is_event_participant(event_id)
  );

drop policy if exists "inv_insert" on public.invitations;
create policy "inv_insert" on public.invitations
  for insert with check (
    public.is_event_participant(event_id)
  );

drop policy if exists "inv_update" on public.invitations;
create policy "inv_update" on public.invitations
  for update
  using (
    invited_by = auth.uid()
    or public.is_event_organizer(event_id)
  )
  with check (
    status in ('pending', 'accepted', 'declined')
  );

-- ── expenses ─────────────────────────────
drop policy if exists "exp_select" on public.expenses;
create policy "exp_select" on public.expenses
  for select using (public.is_event_participant(event_id));

drop policy if exists "exp_insert" on public.expenses;
create policy "exp_insert" on public.expenses
  for insert with check (public.is_event_participant(event_id));

drop policy if exists "exp_update" on public.expenses;
create policy "exp_update" on public.expenses
  for update using (
    paid_by = auth.uid()
    or public.is_event_organizer(event_id)
  );

drop policy if exists "exp_delete" on public.expenses;
create policy "exp_delete" on public.expenses
  for delete using (
    paid_by = auth.uid()
    or public.is_event_organizer(event_id)
  );

-- ── expense_splits ────────────────────────
drop policy if exists "es_select" on public.expense_splits;
create policy "es_select" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and public.is_event_participant(e.event_id)
    )
  );

drop policy if exists "es_insert" on public.expense_splits;
create policy "es_insert" on public.expense_splits
  for insert with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and public.is_event_participant(e.event_id)
    )
  );

-- Only the payer of the expense or an organizer can mark splits settled
drop policy if exists "es_update" on public.expense_splits;
create policy "es_update" on public.expense_splits
  for update using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and (e.paid_by = auth.uid() or public.is_event_organizer(e.event_id))
    )
  );

-- ── tasks ─────────────────────────────────
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (public.is_event_participant(event_id));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (public.is_event_participant(event_id));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    created_by = auth.uid()
    or assigned_to = auth.uid()
    or public.is_event_organizer(event_id)
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    created_by = auth.uid()
    or public.is_event_organizer(event_id)
  );

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
create index if not exists idx_events_created_by              on public.events(created_by);
create index if not exists idx_events_date                    on public.events(date);
create index if not exists idx_ep_event_id                    on public.event_participants(event_id);
create index if not exists idx_ep_user_id                     on public.event_participants(user_id);
-- Functional indexes used by the handle_new_user() trigger for fast auto-link lookups.
create index if not exists idx_ep_email_lower                 on public.event_participants(lower(email));
create index if not exists idx_ep_phone_digits                on public.event_participants(regexp_replace(coalesce(phone, ''), '\D', '', 'g'));
-- Prevent the same phone being added to one event twice. Functional unique index
-- (constraints don't support expressions, so this lives at the index level).
create unique index if not exists ux_ep_event_phone_digits
  on public.event_participants(event_id, regexp_replace(phone, '\D', '', 'g'))
  where phone is not null;
create index if not exists idx_invitations_token              on public.invitations(token);
create index if not exists idx_invitations_event_id           on public.invitations(event_id);
create index if not exists idx_invitations_expires_at         on public.invitations(expires_at);
create index if not exists idx_expenses_event_id              on public.expenses(event_id);
create index if not exists idx_expense_splits_exp_id          on public.expense_splits(expense_id);
create index if not exists idx_expense_splits_participant_id  on public.expense_splits(participant_id);
create index if not exists idx_tasks_event_id                 on public.tasks(event_id);
create index if not exists idx_tasks_assigned_to              on public.tasks(assigned_to);
