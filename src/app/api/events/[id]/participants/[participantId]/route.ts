import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string; participantId: string }> }

const NOT_FOUND_CODE = 'PGRST116'

export async function DELETE(_req: Request, { params }: Params) {
  const { id: eventId, participantId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the participant belongs to this event
  const { data: target } = await supabase
    .from('event_participants')
    .select('id, user_id, role')
    .eq('id', participantId)
    .eq('event_id', eventId)
    .single()

  if (!target) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

  // Check caller has permission: own record, organizer, or event creator
  const [{ data: event }, { data: myParticipant }] = await Promise.all([
    supabase.from('events').select('created_by').eq('id', eventId).single(),
    supabase.from('event_participants').select('role').eq('event_id', eventId).eq('user_id', user.id).single(),
  ])

  const isSelf = target.user_id === user.id
  const isCreator = event?.created_by === user.id
  const isOrganizer = myParticipant?.role === 'organizer'

  if (!isSelf && !isCreator && !isOrganizer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent removing the last organizer.
  // NOTE: this check is application-level and has a theoretical TOCTOU race window.
  // A DB-level trigger enforcing organizer count > 0 should be added as a follow-up.
  if (target.role === 'organizer') {
    const { count } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('role', 'organizer')

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last organizer' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('event_participants')
    .delete()
    .eq('id', participantId)
    .select('id')
    .single()

  // Distinguish "not found / RLS denied" from real DB errors
  if (error?.code === NOT_FOUND_CODE || (!error && !data)) {
    return NextResponse.json({ error: 'Participant not found or access denied' }, { status: 404 })
  }

  if (error) {
    console.error('[DELETE /api/events/[id]/participants/[participantId]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
