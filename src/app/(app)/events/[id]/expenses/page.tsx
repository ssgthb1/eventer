import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExpenseList, type Expense } from '@/components/ExpenseList'

type Params = { params: Promise<{ id: string }> }

export default async function ExpensesPage({ params }: Params) {
  const { id: eventId } = await params
  const user = await getSessionUser()
  const supabase = await createClient()

  const [{ data: event }, { data: participants }, { data: expenses }] = await Promise.all([
    supabase.from('events').select('id, name, created_by').eq('id', eventId).single(),
    supabase
      .from('event_participants')
      .select('id, user_id, display_name, role, profiles(full_name, avatar_url)')
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true }),
    supabase
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
      .order('created_at', { ascending: false }),
  ])

  if (!event) notFound()

  const myParticipant = participants?.find(p => p.user_id === user?.id)
  const isCreator = event.created_by === user?.id
  const isOrganizer = isCreator || myParticipant?.role === 'organizer'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-sm text-indigo-600 hover:underline">
          ← {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Expenses</h1>
      </div>

      <ExpenseList
        eventId={eventId}
        initialExpenses={(expenses ?? []) as unknown as Expense[]}
        participants={participants ?? []}
        currentUserId={user?.id ?? ''}
        isOrganizer={isOrganizer}
      />
    </div>
  )
}
