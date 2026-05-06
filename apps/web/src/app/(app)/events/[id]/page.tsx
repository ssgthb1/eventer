import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteEventButton } from '@/components/DeleteEventButton'
import { formatCurrency } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
}

type Params = { params: Promise<{ id: string }> }

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  const supabase = await createClient()

  const [
    { data: event },
    { data: participant },
    { data: expenses },
    { count: participantCount },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    // Skip participant lookup when no session to avoid empty-string UUID query
    user?.id
      ? supabase.from('event_participants').select('role').eq('event_id', id).eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
    // Limit to 500 rows — sufficient for display; DB aggregate RPC preferred at scale
    supabase.from('expenses').select('amount').eq('event_id', id).limit(500),
    supabase.from('event_participants').select('', { count: 'exact', head: true }).eq('event_id', id),
    supabase.from('tasks').select('status').eq('event_id', id),
  ])

  if (!event) notFound()

  const isCreator = event.created_by === user?.id
  const canEdit = isCreator || participant?.role === 'organizer'

  const totalSpend = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

  const taskCounts = {
    open: (tasks ?? []).filter(t => t.status === 'open').length,
    in_progress: (tasks ?? []).filter(t => t.status === 'in_progress').length,
    done: (tasks ?? []).filter(t => t.status === 'done').length,
  }
  const totalTasks = taskCounts.open + taskCounts.in_progress + taskCounts.done

  const expenseList = expenses ?? []
  const budgetSet = event.budget != null
  const budgetNum = budgetSet ? Number(event.budget) : 0
  const overBudget = budgetSet && totalSpend > budgetNum
  // Show full bar when over budget; guard against divide-by-zero when budget is 0
  const budgetPct = overBudget ? 100 : (budgetSet && budgetNum > 0 ? Math.min((totalSpend / budgetNum) * 100, 100) : 0)

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[event.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {event.status}
            </span>
          </div>
          {event.date && (
            <p className="text-slate-500 text-sm">
              {new Date(event.date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/events/${id}/edit`}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Edit
            </Link>
            {isCreator && <DeleteEventButton eventId={id} />}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href={`/events/${id}/participants`}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group"
        >
          <p className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {participantCount ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Participants</p>
        </Link>

        <Link
          href={`/events/${id}/expenses`}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group"
        >
          <p className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {formatCurrency(totalSpend)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{expenseList.length} expense{expenseList.length !== 1 ? 's' : ''}</p>
        </Link>

        <Link
          href={`/events/${id}/tasks`}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group"
        >
          <p className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {taskCounts.done}/{totalTasks}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Tasks done</p>
        </Link>
      </div>

      {/* Budget widget */}
      {budgetSet && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Budget</h2>
            <span className={`text-xs font-medium ${overBudget ? 'text-red-500' : 'text-slate-500'}`}>
              {overBudget
                ? `${formatCurrency(totalSpend - budgetNum)} over budget`
                : `${formatCurrency(budgetNum - totalSpend)} remaining`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500">
            <span>Spent: <span className="font-medium text-slate-700">{formatCurrency(totalSpend)}</span></span>
            <span>Budget: <span className="font-medium text-slate-700">{formatCurrency(budgetNum)}</span></span>
          </div>
        </div>
      )}

      {/* Task progress */}
      {totalTasks > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
            <Link href={`/events/${id}/tasks`} className="text-xs text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{taskCounts.open} open</span>
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">{taskCounts.in_progress} in progress</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{taskCounts.done} done</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(taskCounts.done / totalTasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Details card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        {event.description && (
          <div>
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Description</h2>
            <p className="text-slate-700 text-sm whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {event.location && (
          <div>
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Location</h2>
            <p className="text-slate-700 text-sm">{event.location}</p>
          </div>
        )}

        {event.venue_notes && (
          <div>
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Venue notes</h2>
            <p className="text-slate-700 text-sm whitespace-pre-wrap">{event.venue_notes}</p>
          </div>
        )}

        {!event.description && !event.location && !event.venue_notes && (
          <p className="text-sm text-slate-400">No additional details.</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/events" className="text-sm text-indigo-600 hover:underline">
          ← Back to events
        </Link>
        <Link href={`/events/${id}/participants`} className="text-sm text-indigo-600 hover:underline">
          Participants →
        </Link>
        <Link href={`/events/${id}/expenses`} className="text-sm text-indigo-600 hover:underline">
          Expenses →
        </Link>
        <Link href={`/events/${id}/tasks`} className="text-sm text-indigo-600 hover:underline">
          Tasks →
        </Link>
      </div>
    </div>
  )
}
