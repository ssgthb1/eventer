import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RsvpStatus } from '@/types'

type Params = { params: Promise<{ id: string; participantId: string }> }

// 'pending' is excluded — it is the default state and cannot be set via this endpoint
const VALID_RSVP: RsvpStatus[] = ['yes', 'no', 'maybe']
const NOT_FOUND_CODE = 'PGRST116'

export async function PATCH(request: Request, { params }: Params) {
  const { id: eventId, participantId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { rsvp_status?: RsvpStatus }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { rsvp_status } = body
  if (!rsvp_status || !VALID_RSVP.includes(rsvp_status)) {
    return NextResponse.json({ error: 'rsvp_status must be one of: yes, no, maybe' }, { status: 400 })
  }

  // Verify the participant belongs to this event
  const { data: target } = await supabase
    .from('event_participants')
    .select('id, user_id')
    .eq('id', participantId)
    .eq('event_id', eventId)
    .single()

  if (!target) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

  // Fetch caller's participant record and event in parallel
  const [{ data: myParticipant }, { data: event }] = await Promise.all([
    supabase.from('event_participants').select('role').eq('event_id', eventId).eq('user_id', user.id).single(),
    supabase.from('events').select('created_by').eq('id', eventId).single(),
  ])

  const isSelf = target.user_id === user.id
  const isOrganizer = myParticipant?.role === 'organizer'
  const isCreator = event?.created_by === user.id

  if (!isSelf && !isOrganizer && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // RLS also enforces update permission at DB level
  const { data: updated, error } = await supabase
    .from('event_participants')
    .update({ rsvp_status })
    .eq('id', participantId)
    .select('id, rsvp_status')
    .single()

  if (error?.code === NOT_FOUND_CODE || (!error && !updated)) {
    return NextResponse.json({ error: 'Participant not found or access denied' }, { status: 404 })
  }

  if (error) {
    console.error('[PATCH /api/events/[id]/participants/[participantId]/rsvp]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ participant: updated })
}
