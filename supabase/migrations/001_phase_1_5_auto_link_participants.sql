-- ============================================================
-- Phase 1.5 — Word-of-mouth invites (no Resend / no Twilio)
-- Apply this in the Supabase SQL Editor against the live project.
-- Idempotent: safe to re-run.
-- ============================================================
--
-- What this migration does:
--   * Extends handle_new_user() so that when an authenticated user signs
--     up, any event_participants rows that match their email or phone
--     and currently have user_id IS NULL get claimed.
--   * Populates profiles.phone from auth.users.phone on signup.
--   * Adds indexes to make the trigger's auto-link query fast as the
--     participant table grows.
--   * Adds a unique functional index preventing the same phone from
--     being added to one event twice.
--
-- Why: an event organizer can pre-create participants via the
-- AddParticipantForm (email or phone), and tell the invitee out-of-band
-- ("hey, join my BBQ — I added you"). When the invitee later logs in via
-- Google OAuth (or any auth provider), this trigger links them to the
-- placeholder rows so they immediately see the event.
--
-- Phone matching strips non-digits on both sides ("(415) 555-0100" matches
-- "+14155550100") because organizers type human-readable numbers but
-- Supabase auth stores E.164. Google OAuth does NOT populate
-- auth.users.phone — phone matching only fires for auth methods that do
-- (SMS OTP, etc.).
--
-- Safety notes:
--   * security definer + pinned search_path = ''.
--   * For each event we claim ONE placeholder (oldest joined_at) to avoid
--     violating unique(event_id, user_id) when both email-only and
--     phone-only placeholders happen to match the same new user.
--   * Leftover unclaimed placeholders that match this user are deleted
--     so the same person doesn't appear twice in the participants list.

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

-- Recreate the trigger for self-containment in case the migration is
-- applied to a fresh DB.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Functional indexes for the trigger's match predicates.
create index if not exists idx_ep_email_lower
  on public.event_participants(lower(email));
create index if not exists idx_ep_phone_digits
  on public.event_participants(regexp_replace(coalesce(phone, ''), '\D', '', 'g'));

-- Prevent the same phone being added to one event twice.
create unique index if not exists ux_ep_event_phone_digits
  on public.event_participants(event_id, regexp_replace(phone, '\D', '', 'g'))
  where phone is not null;

-- One-time backfill: link any existing placeholder rows to existing
-- auth.users whose email/phone matches. Useful when an organizer added a
-- participant by email BEFORE this migration shipped, and that participant
-- already had an account.
update public.event_participants ep
   set user_id = sub.user_id
  from (
    select distinct on (ep2.event_id) ep2.id as participant_id, u.id as user_id
      from public.event_participants ep2
      join auth.users u
        on (ep2.email is not null and lower(ep2.email) = lower(u.email))
        or (
          ep2.phone is not null and u.phone is not null
          and regexp_replace(ep2.phone, '\D', '', 'g') = regexp_replace(u.phone, '\D', '', 'g')
        )
     where ep2.user_id is null
     order by ep2.event_id, ep2.joined_at asc
  ) sub
 where ep.id = sub.participant_id;

-- Clean up duplicate placeholders for users we just claimed for.
delete from public.event_participants ep
 using auth.users u
 where ep.user_id is null
   and (
     (ep.email is not null and lower(ep.email) = lower(u.email))
     or (
       ep.phone is not null and u.phone is not null
       and regexp_replace(ep.phone, '\D', '', 'g') = regexp_replace(u.phone, '\D', '', 'g')
     )
   );
