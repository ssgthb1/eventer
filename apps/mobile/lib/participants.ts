// Supabase data access for the participants screen. RLS scopes reads to
// events the user can see and only allows a participant to update their own
// rsvp_status (mirrors the web /api/.../rsvp route's self-update path).

import type { ParticipantRole, RsvpStatus } from '@eventer/shared'

import { supabase } from './supabase'

export type ParticipantRow = {
  id: string
  user_id: string | null
  email: string | null
  phone: string | null
  display_name: string | null
  role: ParticipantRole
  rsvp_status: RsvpStatus
  joined_at: string
  profiles: { full_name: string | null; avatar_url: string | null }[] | null
}

const SELECT =
  'id, user_id, email, phone, display_name, role, rsvp_status, joined_at, profiles(full_name, avatar_url)'

export async function listParticipants(eventId: string): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select(SELECT)
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })
    // Defensive cap consistent with lib/events.ts; RLS already scopes rows.
    .limit(500)

  if (error) {
    console.error('[participants.listParticipants]', error.message)
    throw new Error('Unable to load participants. Please try again.')
  }
  return (data ?? []) as ParticipantRow[]
}

/**
 * Set the caller's own RSVP. 'pending' is intentionally not accepted — it is
 * the default state and not user-selectable, matching the web endpoint.
 */
export async function setRsvp(
  participantId: string,
  rsvpStatus: Exclude<RsvpStatus, 'pending'>,
): Promise<RsvpStatus> {
  const { data, error } = await supabase
    .from('event_participants')
    .update({ rsvp_status: rsvpStatus })
    .eq('id', participantId)
    .select('id, rsvp_status')
    .single()

  if (error || !data) {
    console.error('[participants.setRsvp]', error?.message ?? 'no row updated')
    throw new Error('Could not update your RSVP. Please try again.')
  }
  return (data as { rsvp_status: RsvpStatus }).rsvp_status
}
