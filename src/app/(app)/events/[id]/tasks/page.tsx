import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TaskBoard } from '@/components/TaskBoard'
import type { TaskParticipant } from '@/components/TaskForm'

type Params = { params: Promise<{ id: string }> }

export default async function TasksPage({ params }: Params) {
  const { id: eventId } = await params
  const user = await getSessionUser()
  const supabase = await createClient()

  const [{ data: event }, { data: participants }, { data: tasks }] = await Promise.all([
    supabase.from('events').select('id, name, created_by').eq('id', eventId).single(),
    supabase
      .from('event_participants')
      .select('id, user_id, display_name, role, profiles(full_name, avatar_url)')
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('tasks')
      .select(`
        id, event_id, created_by, assigned_to, title, description, status, due_date, created_at,
        creator:profiles!created_by(full_name),
        assignee:profiles!assigned_to(full_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
  ])

  if (!event) notFound()
  if (!user) notFound()

  const myParticipant = participants?.find(p => p.user_id === user?.id)
  const isCreator = event.created_by === user?.id
  const isOrganizer = isCreator || myParticipant?.role === 'organizer'

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-sm text-indigo-600 hover:underline">
          ← {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Tasks</h1>
      </div>

      <TaskBoard
        eventId={eventId}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialTasks={(tasks ?? []) as any}
        participants={(participants ?? []) as unknown as TaskParticipant[]}
        currentUserId={user?.id ?? ''}
        isOrganizer={isOrganizer}
      />
    </div>
  )
}
