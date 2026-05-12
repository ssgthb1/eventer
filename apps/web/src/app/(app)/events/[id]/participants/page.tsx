import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import { notFound } from 'next/navigation'
import { ParticipantsList } from '@/components/ParticipantsList'
import { AddParticipantForm } from '@/components/AddParticipantForm'
import { InviteForm } from '@/components/InviteForm'
import { BackButton } from '@/components/ui'

// Phase 1.5: invitation emails / SMS are gated off by default. Set
// INVITES_ENABLED=true in the deploy env (and configure RESEND_API_KEY +
// TWILIO_* secrets) to re-enable the InviteForm UI without a code change.
const invitesEnabled = process.env.INVITES_ENABLED === 'true'

type Params = { params: Promise<{ id: string }> }

export default async function ParticipantsPage({ params }: Params) {
  const { id: eventId } = await params
  const user = await getSessionUser()
  const supabase = await createClient()

  const [{ data: event }, { data: participants }] = await Promise.all([
    supabase.from('events').select('id, name, created_by').eq('id', eventId).single(),
    supabase
      .from('event_participants')
      .select('id, user_id, email, phone, display_name, role, rsvp_status, joined_at, profiles(full_name, avatar_url)')
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true }),
  ])

  if (!event) notFound()

  const myParticipant = participants?.find(p => p.user_id === user?.id)
  const isCreator = event.created_by === user?.id
  const isOrganizer = isCreator || myParticipant?.role === 'organizer'

  return (
    <div className="max-w-3xl">
      <div className="mb-6 space-y-2">
        <BackButton href={`/events/${eventId}`} label={event.name} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Participants</h1>
          <p className="text-slate-500 text-sm mt-0.5">{participants?.length ?? 0} people</p>
        </div>
      </div>

      <ParticipantsList
        eventId={eventId}
        initialParticipants={participants ?? []}
        currentUserId={user?.id ?? ''}
        isOrganizer={isOrganizer}
        myParticipantId={myParticipant?.id}
        myRsvpStatus={myParticipant?.rsvp_status}
      />

      {isOrganizer && (
        <div className="mt-6 space-y-4">
          {invitesEnabled && <InviteForm eventId={eventId} />}
          <AddParticipantForm eventId={eventId} />
        </div>
      )}
    </div>
  )
}
