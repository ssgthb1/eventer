import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/session'
import { redirect } from 'next/navigation'
import { AcceptInviteButton } from '@/components/AcceptInviteButton'

type Params = { params: Promise<{ token: string }> }

export default async function InvitePage({ params }: Params) {
  const { token } = await params
  const user = await getSessionUser()

  // If not logged in, redirect to login with ?next= callback
  if (!user) {
    redirect(`/login?next=/invite/${token}`)
  }

  // Fetch invitation details
  const supabase = await createClient()
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, status, expires_at, event_id, events(id, name, date, location, description)')
    .eq('token', token)
    .single()

  const isExpired = invitation && new Date(invitation.expires_at) < new Date()
  const isUsed = invitation?.status !== 'pending'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        {/* Error states */}
        {(error || !invitation) && (
          <Expired message="This invitation link is invalid or does not exist." />
        )}

        {invitation && isExpired && (
          <Expired message="This invitation has expired." />
        )}

        {invitation && !isExpired && isUsed && (
          <Expired message={`This invitation has already been ${invitation.status}.`} />
        )}

        {/* Valid invitation */}
        {invitation && !isExpired && !isUsed && (() => {
          const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events
          return (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 mb-4">
                  <span className="text-2xl">🎉</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">You're invited!</h1>
                {event && (
                  <p className="text-slate-500 text-sm mt-1">
                    You've been invited to <strong className="text-slate-700">{event.name}</strong>
                  </p>
                )}
              </div>

              {event && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2 text-sm text-slate-600">
                  {event.date && (
                    <p>
                      <span className="font-medium">When: </span>
                      {new Date(event.date).toLocaleDateString('en-US', { dateStyle: 'long' })}
                    </p>
                  )}
                  {event.location && (
                    <p>
                      <span className="font-medium">Where: </span>
                      {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-slate-500">{event.description}</p>
                  )}
                </div>
              )}

              <AcceptInviteButton token={token} eventId={invitation.event_id} />
            </>
          )
        })()}
      </div>
    </div>
  )
}

function Expired({ message }: { message: string }) {
  return (
    <div className="text-center py-4">
      <div className="text-3xl mb-3">😕</div>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">Invitation unavailable</h1>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  )
}
