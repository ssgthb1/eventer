import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Calendar, Plus, TrendingDown, MapPin } from 'lucide-react'
import { LinkButton, EmptyState } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const user = await getSessionUser()
  const userId = user!.id
  const supabase = await createClient()
  const now = new Date().toISOString()

  // All queries fired in parallel — none depend on each other
  const [
    { data: profile, error: profileError },
    { data: upcomingEvents },
    { count: totalEvents },
    { count: upcomingCount },
    { data: unsettledSplits },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),

    supabase.from('events')
      .select('id, name, date, location')
      .gte('date', now)
      .order('date', { ascending: true })
      .limit(5),

    supabase.from('events')
      .select('id', { count: 'exact', head: true }),

    supabase.from('events')
      .select('id', { count: 'exact', head: true })
      .gte('date', now),

    // Single join query — no unbounded .in() list
    supabase.from('expense_splits')
      .select('amount_owed, event_participants!inner(user_id)')
      .eq('event_participants.user_id', userId)
      .eq('is_settled', false),
  ])

  if (profileError) console.error('[DashboardPage] profile fetch failed:', profileError.message)

  const totalOwed = unsettledSplits?.reduce((sum, s) => sum + Number(s.amount_owed), 0) ?? 0
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const owesAnything = totalOwed > 0

  return (
    <div className="space-y-8">
      {/* Hero greeting card */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Hey, {firstName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">Here&apos;s what&apos;s coming up.</p>
          </div>
          <LinkButton href="/events/new" variant="primary" size="lg" leftIcon={<Plus />}>
            New event
          </LinkButton>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total events"
          value={String(totalEvents ?? 0)}
          icon={<CalendarDays />}
          accent="brand"
          href="/events"
        />
        <StatCard
          label="Upcoming"
          value={String(upcomingCount ?? 0)}
          icon={<Calendar />}
          accent="info"
          href="/events"
        />
        <StatCard
          label="You owe"
          value={formatCurrency(totalOwed)}
          icon={<TrendingDown />}
          accent={owesAnything ? 'warning' : 'neutral'}
          subtitle={owesAnything ? 'Unsettled across events' : 'All settled up'}
        />
      </div>

      {/* Upcoming events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Upcoming events</h2>
          <LinkButton href="/events" variant="ghost" size="sm" rightIcon={<ArrowRight />}>
            View all
          </LinkButton>
        </div>

        {!upcomingEvents?.length ? (
          <EmptyState
            icon={<Calendar />}
            title="No upcoming events"
            description="Create your first event to start planning, splitting expenses, and tracking tasks."
            action={
              <LinkButton href="/events/new" variant="primary" leftIcon={<Plus />}>
                New event
              </LinkButton>
            }
          />
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                    {event.name}
                  </p>
                  {event.location && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{event.location}</span>
                    </p>
                  )}
                </div>
                {event.date && (
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

type StatAccent = 'brand' | 'info' | 'warning' | 'neutral'

const ACCENT_STYLES: Record<StatAccent, { border: string; icon: string; value: string }> = {
  brand:   { border: 'border-slate-200', icon: 'bg-indigo-50 text-indigo-600', value: 'text-slate-900' },
  info:    { border: 'border-slate-200', icon: 'bg-blue-50 text-blue-600',     value: 'text-slate-900' },
  warning: { border: 'border-amber-200', icon: 'bg-amber-50 text-amber-600',   value: 'text-amber-700' },
  neutral: { border: 'border-slate-200', icon: 'bg-slate-100 text-slate-500',  value: 'text-slate-900' },
}

function StatCard({
  label,
  value,
  icon,
  accent = 'neutral',
  href,
  subtitle,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent?: StatAccent
  href?: string
  subtitle?: string
}) {
  const a = ACCENT_STYLES[accent]
  const content = (
    <div className={cn('bg-white border rounded-xl px-5 py-4 h-full', a.border)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
          <p className={cn('text-2xl font-bold', a.value)}>{value}</p>
          {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>
        <span
          aria-hidden="true"
          className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4', a.icon)}
        >
          {icon}
        </span>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-all hover:-translate-y-0.5 hover:shadow-sm">
        {content}
      </Link>
    )
  }
  // Non-navigable: render as a plain block without the hover lift so it doesn't
  // signal interactivity that doesn't exist. The "You owe" tile uses this path.
  return <div>{content}</div>
}
