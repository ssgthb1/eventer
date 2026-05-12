import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Plus } from 'lucide-react'
import type { Event } from '@/types'
import { Badge, EmptyState, LinkButton } from '@/components/ui'

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
          {events.map((event: Event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="font-semibold text-slate-900 leading-snug">{event.name}</h2>
                <Badge
                  variant={STATUS_VARIANT[event.status as keyof typeof STATUS_VARIANT] ?? 'neutral'}
                  withDot
                  className="flex-shrink-0"
                >
                  {event.status}
                </Badge>
              </div>
              {event.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{event.description}</p>
              )}
              <div className="space-y-1 text-xs text-slate-400">
                {event.date && (
                  <p>{new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                )}
                {event.location && <p>{event.location}</p>}
                {event.budget != null && (
                  <p>Budget: ${Number(event.budget).toFixed(2)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
