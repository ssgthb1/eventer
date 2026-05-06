import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import Link from 'next/link'

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

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hey, {firstName} 👋</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's coming up.</p>
        </div>
        <Link
          href="/events/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New event
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total events" value={String(totalEvents ?? 0)} href="/events" />
        <StatCard label="Upcoming" value={String(upcomingCount ?? 0)} href="/events" />
        <StatCard
          label="You owe"
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalOwed)}
          highlight={totalOwed > 0}
        />
      </div>

      {/* Upcoming events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Upcoming events</h2>
          <Link href="/events" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>

        {!upcomingEvents?.length ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm mb-3">No upcoming events</p>
            <Link href="/events/new" className="text-sm text-indigo-600 hover:underline">
              Create one →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="font-medium text-slate-900">{event.name}</p>
                  {event.location && (
                    <p className="text-xs text-slate-400 mt-0.5">{event.location}</p>
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

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string
  value: string
  href?: string
  highlight?: boolean
}) {
  const content = (
    <div className={`bg-white border rounded-xl px-5 py-4 ${highlight ? 'border-red-200' : 'border-slate-200'}`}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )

  if (href) {
    return <Link href={href} className="block hover:shadow-sm transition-shadow">{content}</Link>
  }
  return content
}
