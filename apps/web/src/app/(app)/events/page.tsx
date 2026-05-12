import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, MapPin, Plus, Wallet } from 'lucide-react'
import type { Event } from '@/types'
import { Badge, EmptyState, LinkButton } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

const STATUS_VARIANT = {
  draft: 'neutral',
  active: 'success',
  completed: 'info',
} as const

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true, nullsFirst: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-500 text-sm mt-0.5">{events?.length ?? 0} events</p>
        </div>
        <LinkButton href="/events/new" variant="primary" leftIcon={<Plus />}>
          New event
        </LinkButton>
      </div>

      {!events?.length ? (
        <EmptyState
          icon={<Calendar />}
          title="No events yet"
          description="Create your first event to start planning."
          action={
            <LinkButton href="/events/new" variant="primary" leftIcon={<Plus />}>
              Create your first event
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => {
            const dateObj = event.date ? new Date(event.date) : null
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                {/* Date strip — gives every card a consistent visual anchor */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-br from-indigo-50 to-white border-b border-slate-100">
                  {dateObj ? (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span className="inline-flex flex-col items-center justify-center w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm leading-none">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-600">
                          {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {dateObj.getDate()}
                        </span>
                      </span>
                      <span className="text-slate-500">
                        {dateObj.toLocaleDateString(undefined, { weekday: 'short' })} ·{' '}
                        {dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      No date set
                    </span>
                  )}
                  <Badge
                    variant={STATUS_VARIANT[event.status as keyof typeof STATUS_VARIANT] ?? 'neutral'}
                    withDot
                    className="flex-shrink-0"
                  >
                    {event.status}
                  </Badge>
                </div>

                {/* Body */}
                <div className="flex-1 p-5">
                  <h2 className="font-semibold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {event.name}
                  </h2>
                  {event.description && (
                    <p className="mt-2 text-sm text-slate-500 line-clamp-2">{event.description}</p>
                  )}

                  <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {event.budget != null && (
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-slate-400" />
                        <span>Budget {formatCurrency(Number(event.budget))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
