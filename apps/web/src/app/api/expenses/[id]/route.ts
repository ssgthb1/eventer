import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

/** Integer-cent equal split to avoid float arithmetic errors. */
function buildEqualSplits(
  expenseId: string,
  participantIds: string[],
  amount: number
): { expense_id: string; participant_id: string; amount_owed: number }[] {
  const totalCents = Math.round(amount * 100)
  const sharePerCents = Math.floor(totalCents / participantIds.length)
  const remainderCents = totalCents - sharePerCents * participantIds.length
  return participantIds.map((id, i) => ({
    expense_id: expenseId,
    participant_id: id,
    amount_owed: (sharePerCents + (i === participantIds.length - 1 ? remainderCents : 0)) / 100,
  }))
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch existing expense with all fields needed for rollback
  const { data: existing, error: fetchError } = await supabase
    .from('expenses')
    .select('id, event_id, paid_by, description, amount, split_type')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  // Verify edit permission: payer, organizer, or event creator
  const isOwner = existing.paid_by === user.id
  const [{ data: myParticipant }, { data: event }] = await Promise.all([
    supabase.from('event_participants').select('role').eq('event_id', existing.event_id).eq('user_id', user.id).single(),
    supabase.from('events').select('created_by').eq('id', existing.event_id).single(),
  ])

  if (!isOwner && myParticipant?.role !== 'organizer' && event?.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    description?: string
    amount?: number
    paid_by?: string
    split_type?: 'equal' | 'custom'
    splits?: { participant_id: string; amount_owed: number }[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { description, amount, paid_by, split_type = 'equal', splits } = body

  if (!description?.trim()) return NextResponse.json({ error: 'description is required' }, { status: 400 })
  if (!amount || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive finite number' }, { status: 400 })
  }
  if (!paid_by) return NextResponse.json({ error: 'paid_by is required' }, { status: 400 })
  if (split_type !== 'equal' && split_type !== 'custom') {
    return NextResponse.json({ error: 'split_type must be equal or custom' }, { status: 400 })
  }

  // Verify paid_by is a participant
  const { data: payerParticipant } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', existing.event_id)
    .eq('user_id', paid_by)
    .single()

  if (!payerParticipant) {
    return NextResponse.json({ error: 'paid_by user is not a participant of this event' }, { status: 400 })
  }

  const { data: participants } = await supabase
    .from('event_participants')
    .select('id, user_id')
    .eq('event_id', existing.event_id)

  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: 'No participants found' }, { status: 400 })
  }

  const participantIds = participants.map(p => p.id)
  let newSplits: { expense_id: string; participant_id: string; amount_owed: number }[] = []

  if (split_type === 'equal') {
    newSplits = buildEqualSplits(id, participantIds, amount)
  } else {
    if (!splits || splits.length === 0) {
      return NextResponse.json({ error: 'splits are required for custom split_type' }, { status: 400 })
    }
    const total = splits.reduce((sum, s) => sum + s.amount_owed, 0)
    if (Math.abs(total - amount) > 0.01) {
      return NextResponse.json({ error: 'Split amounts must sum to total expense amount' }, { status: 400 })
    }
    const validIds = new Set(participantIds)
    for (const s of splits) {
      if (!validIds.has(s.participant_id)) {
        return NextResponse.json({ error: `participant_id ${s.participant_id} is not in this event` }, { status: 400 })
      }
      if (s.amount_owed < 0) {
        return NextResponse.json({ error: 'Split amounts must be non-negative' }, { status: 400 })
      }
    }
    newSplits = splits.map(s => ({ expense_id: id, participant_id: s.participant_id, amount_owed: s.amount_owed }))
  }

  // Save old splits for rollback
  const { data: oldSplits } = await supabase
    .from('expense_splits')
    .select('participant_id, amount_owed, is_settled')
    .eq('expense_id', id)

  // Update expense
  const { error: updateError } = await supabase
    .from('expenses')
    .update({ description: description.trim(), amount, paid_by, split_type })
    .eq('id', id)

  if (updateError) {
    console.error('[PUT /api/expenses/[id]] update expense', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Replace splits — best-effort rollback on failure
  const { error: deleteError } = await supabase
    .from('expense_splits')
    .delete()
    .eq('expense_id', id)

  if (deleteError) {
    console.error('[PUT /api/expenses/[id]] delete splits', deleteError)
    // Revert expense update
    await supabase.from('expenses').update({
      description: existing.description,
      amount: existing.amount,
      paid_by: existing.paid_by,
      split_type: existing.split_type,
    }).eq('id', id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const { error: splitsError } = await supabase
    .from('expense_splits')
    .insert(newSplits)

  if (splitsError) {
    console.error('[PUT /api/expenses/[id]] insert splits', splitsError)
    // Best-effort rollback: restore expense and old splits
    await supabase.from('expenses').update({
      description: existing.description,
      amount: existing.amount,
      paid_by: existing.paid_by,
      split_type: existing.split_type,
    }).eq('id', id)
    if (oldSplits && oldSplits.length > 0) {
      await supabase.from('expense_splits').insert(oldSplits.map(s => ({ expense_id: id, ...s })))
    }
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
    .from('expenses')
    .select('id, event_id, paid_by')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  // Explicit permission check (RLS silent-success on unauthorized rows is not sufficient)
  const isOwner = existing.paid_by === user.id
  const [{ data: myParticipant }, { data: event }] = await Promise.all([
    supabase.from('event_participants').select('role').eq('event_id', existing.event_id).eq('user_id', user.id).single(),
    supabase.from('events').select('created_by').eq('id', existing.event_id).single(),
  ])

  if (!isOwner && myParticipant?.role !== 'organizer' && event?.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[DELETE /api/expenses/[id]]', deleteError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
