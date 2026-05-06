import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing, error: fetchError } = await supabase
    .from('tasks')
    .select('id, event_id, created_by, assigned_to')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Permission: creator, assignee, or organizer/creator of event
  const isCreator = existing.created_by === user.id
  const isAssignee = existing.assigned_to === user.id
  const [{ data: myParticipant }, { data: event }] = await Promise.all([
    supabase.from('event_participants').select('role').eq('event_id', existing.event_id).eq('user_id', user.id).single(),
    supabase.from('events').select('created_by').eq('id', existing.event_id).single(),
  ])
  const isOrganizer = myParticipant?.role === 'organizer' || event?.created_by === user.id

  if (!isCreator && !isAssignee && !isOrganizer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    title?: string
    description?: string | null
    status?: 'open' | 'in_progress' | 'done'
    due_date?: string | null
    assigned_to?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { title, description, status, due_date, assigned_to } = body

  if (title !== undefined && !title.trim()) {
    return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
  }
  if (title !== undefined && title.trim().length > 200) {
    return NextResponse.json({ error: 'title must be 200 characters or fewer' }, { status: 400 })
  }
  if (status !== undefined && !['open', 'in_progress', 'done'].includes(status)) {
    return NextResponse.json({ error: 'status must be open, in_progress, or done' }, { status: 400 })
  }
  if (due_date && (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) || isNaN(Date.parse(due_date)))) {
    return NextResponse.json({ error: 'due_date must be a valid YYYY-MM-DD date' }, { status: 400 })
  }

  if (assigned_to) {
    const { data: assigneeParticipant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', existing.event_id)
      .eq('user_id', assigned_to)
      .single()

    if (!assigneeParticipant) {
      return NextResponse.json({ error: 'assigned_to user is not a participant of this event' }, { status: 400 })
    }
  }

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title.trim()
  if (description !== undefined) updates.description = description?.trim() || null
  if (status !== undefined) updates.status = status
  if (due_date !== undefined) updates.due_date = due_date || null
  if (assigned_to !== undefined) updates.assigned_to = assigned_to || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    console.error('[PUT /api/tasks/[id]]', updateError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing, error: fetchError } = await supabase
    .from('tasks')
    .select('id, event_id, created_by')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Explicit permission check (RLS silent-success on DELETE is not sufficient)
  const isCreator = existing.created_by === user.id
  const [{ data: myParticipant }, { data: event }] = await Promise.all([
    supabase.from('event_participants').select('role').eq('event_id', existing.event_id).eq('user_id', user.id).single(),
    supabase.from('events').select('created_by').eq('id', existing.event_id).single(),
  ])
  const isOrganizer = myParticipant?.role === 'organizer' || event?.created_by === user.id

  if (!isCreator && !isOrganizer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id)

  if (deleteError) {
    console.error('[DELETE /api/tasks/[id]]', deleteError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
