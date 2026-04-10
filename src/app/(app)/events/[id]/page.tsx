import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteEventButton } from '@/components/DeleteEventButton'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
}

type Params = { params: Promise<{ id: string }> }

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const isCreator = event.created_by === user?.id

  const { data: participant } = await supabase
    .from('event_participants')
    .select('role')
    .eq('event_id', id)
    .eq('user_id', user?.id)
    .single()

  const canEdit = isCreator || participant?.role === 'organizer'

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[event.status]}`}>
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

        {event.budget != null && (
          <div>
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Budget</h2>
            <p className="text-slate-700 text-sm">${Number(event.budget).toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
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
