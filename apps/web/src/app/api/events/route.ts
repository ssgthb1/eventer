import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EventStatus } from '@/types'

const VALID_STATUSES: EventStatus[] = ['draft', 'active', 'completed']

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS ensures only events the user created or participates in are returned
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[GET /api/events]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ events })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    name?: string
    description?: string
    date?: string
    location?: string
    venue_notes?: string
    budget?: number
    status?: EventStatus
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, description, date, location, venue_notes, budget, status } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
  }

  if (budget !== undefined && budget !== null &&
    (typeof budget !== 'number' || !isFinite(budget) || budget < 0)) {
    return NextResponse.json({ error: 'Budget must be a non-negative number' }, { status: 400 })
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  // Create the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      created_by: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      date: date || null,
      location: location?.trim() || null,
      venue_notes: venue_notes?.trim() || null,
      budget: budget ?? null,
      status: status ?? 'active',
    })
    .select()
    .single()

  if (eventError) {
    console.error('[POST /api/events] insert event', eventError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Add creator as organizer participant — if this fails, roll back the event
  const { error: participantError } = await supabase
    .from('event_participants')
    .insert({
      event_id: event.id,
      user_id: user.id,
      role: 'organizer',
      rsvp_status: 'yes',
    })

  if (participantError) {
    console.error('[POST /api/events] insert participant — rolling back event', participantError)
    await supabase.from('events').delete().eq('id', event.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ event }, { status: 201 })
}
