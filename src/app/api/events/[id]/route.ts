import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EventStatus } from '@/types'

type Params = { params: Promise<{ id: string }> }

const VALID_STATUSES: EventStatus[] = ['draft', 'active', 'completed']

// PGRST116 = no rows matched (RLS filtered out or wrong id)
const NOT_FOUND_CODE = 'PGRST116'

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error?.code === NOT_FOUND_CODE || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (error) {
    console.error('[GET /api/events/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ event })
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    name?: string
    description?: string
    date?: string
    location?: string
    venue_notes?: string
    budget?: number | null
    status?: EventStatus
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, description, date, location, venue_notes, budget, status } = body

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: 'Event name cannot be empty' }, { status: 400 })
  }

  if (budget !== undefined && budget !== null &&
    (typeof budget !== 'number' || !isFinite(budget) || budget < 0)) {
    return NextResponse.json({ error: 'Budget must be a non-negative number' }, { status: 400 })
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description?.trim() || null
  if (date !== undefined) updates.date = date || null
  if (location !== undefined) updates.location = location?.trim() || null
  if (venue_notes !== undefined) updates.venue_notes = venue_notes?.trim() || null
  if (budget !== undefined) updates.budget = budget
  if (status !== undefined) updates.status = status

  // RLS enforces: only creator or organizer can update
  const { data: event, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error?.code === NOT_FOUND_CODE || !event) {
    return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
  }

  if (error) {
    console.error('[PUT /api/events/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ event })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS enforces: only creator can delete
  // .select('id') lets us detect if the row was actually deleted
  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error?.code === NOT_FOUND_CODE || !data) {
    return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
  }

  if (error) {
    console.error('[DELETE /api/events/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
