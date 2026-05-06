import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id: eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS ensures only event participants can see the list
  const { data: participants, error } = await supabase
    .from('event_participants')
    .select('id, user_id, email, display_name, role, rsvp_status, joined_at, profiles(full_name, avatar_url)')
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('[GET /api/events/[id]/participants]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ participants })
}

export async function POST(request: Request, { params }: Params) {
  const { id: eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch event and caller's participant record in parallel
  const [{ data: event }, { data: myParticipant }] = await Promise.all([
    supabase.from('events').select('created_by').eq('id', eventId).single(),
    supabase.from('event_participants').select('role').eq('event_id', eventId).eq('user_id', user.id).single(),
  ])

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const isCreator = event.created_by === user.id
  const isOrganizer = myParticipant?.role === 'organizer'

  if (!isCreator && !isOrganizer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { email?: string; display_name?: string; role?: 'organizer' | 'participant' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, display_name, role = 'participant' } = body

  if (!email?.trim() && !display_name?.trim()) {
    return NextResponse.json({ error: 'Email or display name is required' }, { status: 400 })
  }

  if (role !== 'organizer' && role !== 'participant') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Only the event creator can add another organizer
  if (role === 'organizer' && !isCreator) {
    return NextResponse.json({ error: 'Only the event creator can add organizers' }, { status: 403 })
  }

  // Basic email format check
  if (email?.trim() && !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // Add participant by email/name — user_id linking happens via invitations (#14)
  const { data: participant, error } = await supabase
    .from('event_participants')
    .insert({
      event_id: eventId,
      user_id: null,
      email: email?.trim() || null,
      display_name: display_name?.trim() || null,
      role,
      rsvp_status: 'pending',
    })
    .select('id, user_id, email, display_name, role, rsvp_status, joined_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This participant is already in the event' }, { status: 409 })
    }
    console.error('[POST /api/events/[id]/participants]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ participant }, { status: 201 })
}
