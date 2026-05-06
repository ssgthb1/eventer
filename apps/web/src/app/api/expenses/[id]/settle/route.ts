import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id: expenseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { participant_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { participant_id } = body
  if (!participant_id) return NextResponse.json({ error: 'participant_id is required' }, { status: 400 })

  // Fetch expense for permission check
  const { data: expense, error: fetchError } = await supabase
    .from('expenses')
    .select('id, event_id, paid_by')
    .eq('id', expenseId)
    .single()

  if (fetchError || !expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  // Only payer, organizer, or event creator can settle splits
  const isOwner = expense.paid_by === user.id
  const [{ data: myParticipant }, { data: event }] = await Promise.all([
    supabase.from('event_participants').select('role').eq('event_id', expense.event_id).eq('user_id', user.id).single(),
    supabase.from('events').select('created_by').eq('id', expense.event_id).single(),
  ])

  if (!isOwner && myParticipant?.role !== 'organizer' && event?.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the split exists for this expense
  const { data: split, error: splitError } = await supabase
    .from('expense_splits')
    .select('id, is_settled')
    .eq('expense_id', expenseId)
    .eq('participant_id', participant_id)
    .single()

  if (splitError || !split) {
    return NextResponse.json({ error: 'Split not found' }, { status: 404 })
  }

  // Conditional update guards against concurrent settle requests (check-then-act race)
  const { data: updated, error: updateError } = await supabase
    .from('expense_splits')
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .eq('id', split.id)
    .eq('is_settled', false)
    .select('id')

  if (updateError) {
    console.error('[POST /api/expenses/[id]/settle] code:', updateError.code, updateError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Split is already settled' }, { status: 409 })
  }

  return NextResponse.json({ success: true })
}
