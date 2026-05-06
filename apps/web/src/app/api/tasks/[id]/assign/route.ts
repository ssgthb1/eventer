import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { assigned_to?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { assigned_to } = body

  // assigned_to must be present in body (can be null to unassign)
  if (!('assigned_to' in body)) {
    return NextResponse.json({ error: 'assigned_to is required (use null to unassign)' }, { status: 400 })
  }

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, event_id, created_by, assigned_to')
    .eq('id', id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Always verify the caller is a current event participant
  const [{ data: myParticipant }, { data: event }] = await Promise.all([
    supabase.from('event_participants').select('role').eq('event_id', task.event_id).eq('user_id', user.id).single(),
    supabase.from('events').select('created_by').eq('id', task.event_id).single(),
  ])

  if (!myParticipant && event?.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Any current participant can assign/unassign anyone — no organizer restriction needed

  // Verify target user is a participant (if assigning)
  if (assigned_to) {
    const { data: assigneeParticipant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', task.event_id)
      .eq('user_id', assigned_to)
      .single()

    if (!assigneeParticipant) {
      return NextResponse.json({ error: 'assigned_to user is not a participant of this event' }, { status: 400 })
    }
  }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ assigned_to: assigned_to ?? null })
    .eq('id', id)

  if (updateError) {
    console.error('[POST /api/tasks/[id]/assign]', updateError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
