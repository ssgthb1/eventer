// Supabase data access for event screens. Queries go straight through the
// SDK (apps/mobile/lib/supabase.ts); row-level security scopes results to the
// signed-in user, so there is no dependency on the web app's API routes.

import type { Event, TaskStatus } from '@eventer/shared'

import { supabase } from './supabase'

// Columns the list/home screens actually render — avoids shipping wide
// columns like venue_notes over the wire for every card.
const LIST_COLUMNS = 'id, name, description, date, location, budget, status, created_at'

// Defensive cap so an organizer in hundreds of events doesn't pull the whole
// set on every tab mount. RLS already scopes rows to the user.
const LIST_LIMIT = 200

function userMessage(context: string, error: { message: string }): Error {
  // Supabase errors can carry schema/constraint detail — log it, surface a
  // generic message to the UI.
  console.error(`[events.${context}]`, error.message)
  return new Error('Unable to load events. Please try again.')
}

export async function listEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(LIST_COLUMNS)
    .order('date', { ascending: true, nullsFirst: false })
    .limit(LIST_LIMIT)

  if (error) throw userMessage('listEvents', error)
  return (data ?? []) as Event[]
}

export type EventDetail = {
  event: Event
  participantCount: number
  expenseCount: number
  totalSpend: number
  taskCounts: { open: number; in_progress: number; done: number; total: number }
}

export async function getEventDetail(id: string): Promise<EventDetail> {
  const [
    { data: event, error: eventError },
    { count: participantCount, error: participantError },
    { data: expenses, error: expenseError },
    { data: tasks, error: taskError },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase
      .from('event_participants')
      .select('', { count: 'exact', head: true })
      .eq('event_id', id),
    // Limit to 500 rows — sufficient for the summary total; matches web.
    supabase.from('expenses').select('amount').eq('event_id', id).limit(500),
    // Same rationale as expenses: only counts are needed for the summary.
    supabase.from('tasks').select('status').eq('event_id', id).limit(500),
  ])

  const firstError = eventError || participantError || expenseError || taskError
  if (firstError) throw userMessage('getEventDetail', firstError)
  if (!event) throw new Error('Event not found')

  const expenseRows = (expenses ?? []) as { amount: number }[]
  const totalSpend = expenseRows.reduce((sum, e) => sum + Number(e.amount), 0)

  const taskRows = (tasks ?? []) as { status: TaskStatus }[]
  const taskCounts = {
    open: taskRows.filter((t) => t.status === 'open').length,
    in_progress: taskRows.filter((t) => t.status === 'in_progress').length,
    done: taskRows.filter((t) => t.status === 'done').length,
    total: taskRows.length,
  }

  return {
    event: event as Event,
    participantCount: participantCount ?? 0,
    expenseCount: expenseRows.length,
    totalSpend,
    taskCounts,
  }
}
