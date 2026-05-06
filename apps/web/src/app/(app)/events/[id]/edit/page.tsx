import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EventForm } from '@/components/EventForm'
import type { Event } from '@/types'

type Params = { params: Promise<{ id: string }> }

export default async function EditEventPage({ params }: Params) {
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

  if (!isCreator && participant?.role !== 'organizer') redirect(`/events/${id}`)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit event</h1>
      <EventForm event={event as Event} />
    </div>
  )
}
