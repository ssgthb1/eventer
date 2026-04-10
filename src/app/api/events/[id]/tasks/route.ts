import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

const TASK_SELECT = `
  id, event_id, created_by, assigned_to, title, description, status, due_date, created_at,
  creator:profiles!created_by(full_name),
  assignee:profiles!assigned_to(full_name)
`

export async function GET(_req: Request, { params }: Params) {
  const { id: eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify participant (RLS also enforces this)
  const { data: myParticipant } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!myParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/events/[id]/tasks]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ tasks })
}

export async function POST(request: Request, { params }: Params) {
  const { id: eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myParticipant } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!myParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { title?: string; description?: string; due_date?: string | null; assigned_to?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { title, description, due_date, assigned_to } = body

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if (title.trim().length > 200) return NextResponse.json({ error: 'title must be 200 characters or fewer' }, { status: 400 })

  // Validate due_date format and calendar validity
  if (due_date && (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) || isNaN(Date.parse(due_date)))) {
    return NextResponse.json({ error: 'due_date must be a valid YYYY-MM-DD date' }, { status: 400 })
  }

  // Validate assigned_to is a participant with a user account
  if (assigned_to) {
    const { data: assigneeParticipant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', assigned_to)
      .single()

    if (!assigneeParticipant) {
      return NextResponse.json({ error: 'assigned_to user is not a participant of this event' }, { status: 400 })
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      event_id: eventId,
      created_by: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: due_date || null,
      assigned_to: assigned_to || null,
    })
    .select('id')
    .single()

  if (error || !task) {
    console.error('[POST /api/events/[id]/tasks]', error?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ task: { id: task.id } }, { status: 201 })
}
