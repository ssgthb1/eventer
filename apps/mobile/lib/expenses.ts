// Supabase data access for the expenses screen. Direct SDK + RLS (same as
// the rest of the mobile data layer). The nested select mirrors the web
// expenses page so calculateBalances() from @eventer/shared receives the
// exact shape it does on web.

import type { SplitType } from '@eventer/shared'

import { supabase } from './supabase'

export type SplitParticipant = {
  id: string
  user_id: string | null
  display_name: string | null
  profiles: { full_name: string | null }[] | null
}

export type ExpenseSplitRow = {
  id: string
  amount_owed: number
  is_settled: boolean
  participant_id: string
  event_participants: SplitParticipant | null
}

export type ExpenseRow = {
  id: string
  description: string
  amount: number
  paid_by: string
  split_type: SplitType
  created_at: string
  payer: { full_name: string | null }[] | null
  expense_splits: ExpenseSplitRow[]
}

// Shape calculateBalances() consumes (mirrors web BalanceSummary props).
export type BalanceParticipant = {
  id: string
  user_id: string | null
  display_name: string | null
  role: string
  profiles: { full_name: string | null }[] | null
}

export type ExpensesData = {
  eventCreatedBy: string | null
  participants: BalanceParticipant[]
  expenses: ExpenseRow[]
}

const EXPENSE_SELECT = `
  id, amount, description, split_type, created_at, paid_by,
  payer:profiles!paid_by(full_name),
  expense_splits(
    id, amount_owed, is_settled, participant_id,
    event_participants(
      id, user_id, display_name,
      profiles(full_name)
    )
  )
`

export async function getExpensesData(eventId: string): Promise<ExpensesData> {
  const [
    { data: event, error: eventError },
    { data: participants, error: participantError },
    { data: expenses, error: expenseError },
  ] = await Promise.all([
    supabase.from('events').select('created_by').eq('id', eventId).single(),
    supabase
      .from('event_participants')
      .select('id, user_id, display_name, role, profiles(full_name)')
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true })
      .limit(500),
    supabase
      .from('expenses')
      .select(EXPENSE_SELECT)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const firstError = eventError || participantError || expenseError
  if (firstError) {
    console.error('[expenses.getExpensesData]', firstError.message)
    throw new Error('Unable to load expenses. Please try again.')
  }

  return {
    eventCreatedBy: event?.created_by ?? null,
    participants: (participants ?? []) as BalanceParticipant[],
    // Double-cast mirrors the web expenses page: the SDK's inferred type for
    // this deeply-nested embed is unwieldy and PostgREST returns the embedded
    // resources (payer, profiles) as arrays — the shape ExpenseRow declares.
    expenses: (expenses ?? []) as unknown as ExpenseRow[],
  }
}

/**
 * Mark a split settled. Conditional update (`... and is_settled = false`)
 * guards the check-then-act race exactly like the web /settle route. The
 * `es_update` RLS policy permits the expense payer or an event organizer;
 * the event creator is always inserted as an organizer participant on event
 * creation, so creators are covered transitively. A denied or
 * already-settled update returns zero rows.
 */
export async function settleSplit(splitId: string): Promise<void> {
  const { data, error } = await supabase
    .from('expense_splits')
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .eq('id', splitId)
    .eq('is_settled', false)
    .select('id')

  if (error) {
    console.error('[expenses.settleSplit]', error.message)
    throw new Error('Could not settle. Please try again.')
  }
  if (!data || data.length === 0) {
    // Either already settled by someone else, or RLS denied the update.
    throw new Error("This split is already settled (or you can't settle it).")
  }
}
