import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  CheckSquare,
  ChevronRight,
  DollarSign,
  MapPin,
  Pencil,
  Users,
} from 'lucide-react'
import { DeleteEventButton } from '@/components/DeleteEventButton'
import { ShareEventButton } from '@/components/ShareEventButton'
import { Badge, BackButton, LinkButton } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'

const STATUS_VARIANT = {
  draft: 'neutral',
  active: 'success',
  completed: 'info',
} as const

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
      {/* Top navigation */}
      <BackButton href="/events" label="Back to events" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
            <Badge
              variant={STATUS_VARIANT[event.status as keyof typeof STATUS_VARIANT] ?? 'neutral'}
              withDot
            >
              {event.status}
            </Badge>
          </div>
          {event.date && (
            <p className="text-slate-500 text-sm">
              {new Date(event.date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          )}
          {event.location && (
            <p className="mt-1 inline-flex items-center gap-1 text-slate-500 text-sm">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <ShareEventButton eventId={id} />
          {canEdit && (
            <>
              <LinkButton href={`/events/${id}/edit`} variant="secondary" size="sm" leftIcon={<Pencil />}>
                Edit
              </LinkButton>
              {isCreator && <DeleteEventButton eventId={id} />}
            </>
          )}
        </div>
      </div>

      {/* Quick stats — also the primary section navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile
          href={`/events/${id}/participants`}
          label="Participants"
          value={String(participantCount ?? 0)}
          icon={<Users />}
          accent="brand"
        />
        <StatTile
          href={`/events/${id}/expenses`}
          label={`${expenseList.length} expense${expenseList.length !== 1 ? 's' : ''}`}
          value={formatCurrency(totalSpend)}
          icon={<DollarSign />}
          accent="success"
        />
        <StatTile
          href={`/events/${id}/tasks`}
          label="Tasks done"
          value={`${taskCounts.done}/${totalTasks}`}
          icon={<CheckSquare />}
          accent="info"
        />
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
            <LinkButton href={`/events/${id}/tasks`} variant="ghost" size="xs" rightIcon={<ArrowRight />}>
              View all
            </LinkButton>
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
    </div>
  )
}

type StatAccent = 'brand' | 'success' | 'info'

const STAT_ACCENT: Record<StatAccent, { icon: string; hoverBorder: string }> = {
  brand:   { icon: 'bg-indigo-50 text-indigo-600', hoverBorder: 'hover:border-indigo-300' },
  success: { icon: 'bg-green-50 text-green-600',   hoverBorder: 'hover:border-green-300' },
  info:    { icon: 'bg-blue-50 text-blue-600',     hoverBorder: 'hover:border-blue-300' },
}

function StatTile({
  href,
  label,
  value,
  icon,
  accent,
}: {
  href: string
  label: string
  value: string
  icon: React.ReactNode
  accent: StatAccent
}) {
  const a = STAT_ACCENT[accent]
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm',
        a.hoverBorder,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          aria-hidden="true"
          className={cn('inline-flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 [&_svg]:h-5 [&_svg]:w-5', a.icon)}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900 leading-tight truncate group-hover:text-indigo-700 transition-colors">
            {value}
          </p>
          <p className="text-xs text-slate-500 truncate">{label}</p>
        </div>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 text-slate-300 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500"
      />
    </Link>
  )
}
