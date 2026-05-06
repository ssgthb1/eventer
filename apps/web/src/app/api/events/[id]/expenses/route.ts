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

export async function GET(_req: Request, { params }: Params) {
  const { id: eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is an event participant
  const { data: myParticipant } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!myParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(`
      id, amount, description, split_type, created_at, paid_by,
      payer:profiles!paid_by(full_name, avatar_url),
      expense_splits(
        id, amount_owed, is_settled, participant_id,
        event_participants(
          id, user_id, display_name,
          profiles(full_name, avatar_url)
        )
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/events/[id]/expenses]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ expenses })
}

export async function POST(request: Request, { params }: Params) {
  const { id: eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is an event participant (RLS also enforces this)
  const { data: myParticipant } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!myParticipant) {
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

  // Verify paid_by is an event participant with a profile
  const { data: payerParticipant } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', paid_by)
    .single()

  if (!payerParticipant) {
    return NextResponse.json({ error: 'paid_by user is not a participant of this event' }, { status: 400 })
  }

  // Fetch participants for split calculation
  const { data: participants } = await supabase
    .from('event_participants')
    .select('id, user_id')
    .eq('event_id', eventId)

  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: 'No participants found' }, { status: 400 })
  }

  const participantIds = participants.map(p => p.id)

  // Build splits array
  let splitsToInsert: { expense_id: string; participant_id: string; amount_owed: number }[] = []

  if (split_type === 'equal') {
    splitsToInsert = buildEqualSplits('', participantIds, amount)
  } else {
    // custom split
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
    splitsToInsert = splits.map(s => ({ expense_id: '', participant_id: s.participant_id, amount_owed: s.amount_owed }))
  }

  // Insert expense
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({ event_id: eventId, paid_by, amount, description: description.trim(), split_type })
    .select('id')
    .single()

  if (expenseError || !expense) {
    console.error('[POST /api/events/[id]/expenses] insert expense', expenseError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Insert splits (roll back expense on failure)
  const { error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splitsToInsert.map(s => ({ ...s, expense_id: expense.id })))

  if (splitsError) {
    console.error('[POST /api/events/[id]/expenses] insert splits', splitsError)
    await supabase.from('expenses').delete().eq('id', expense.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ expense: { id: expense.id } }, { status: 201 })
}
