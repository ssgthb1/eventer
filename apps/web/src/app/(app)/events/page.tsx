import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Event } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
}

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
        <Link
          href="/events/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New event
        </Link>
      </div>

      {!events?.length ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400 mb-4">No events yet</p>
          <Link
            href="/events/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create your first event
          </Link>
        </div>
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
                <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[event.status]}`}>
                  {event.status}
                </span>
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
