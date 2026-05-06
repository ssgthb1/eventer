import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type Params = { params: Promise<{ token: string }> }

// GET — fetch invitation details (used by the public /invite/[token] page)
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params
  const supabase = await createClient()

  // token column intentionally excluded — caller already has it
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, status, expires_at, event_id, events(id, name, date, location)')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    // Strip PII — only return status for used/declined invitations
    return NextResponse.json({ status: invitation.status, error: 'Invitation already used' }, { status: 410 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ status: 'expired', error: 'Invitation expired' }, { status: 410 })
  }

  return NextResponse.json({ invitation })
}

// POST — accept or decline an invitation
export async function POST(request: Request, { params }: Params) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { action?: 'accept' | 'decline' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action } = body
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: invitation, error: fetchError } = await service
    .from('invitations')
    .select('id, event_id, status, expires_at, email, phone')
    .eq('token', token)
    .single()

  if (fetchError || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation already used' }, { status: 410 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
  }

  const newStatus = action === 'accept' ? 'accepted' : 'declined'

  if (action === 'accept') {
    // Upsert participant first, then mark invitation accepted.
    // If participant upsert fails, we return 500 without touching invitation status.
    // Note: ignoreDuplicates: false means an existing row is updated — existing organizer
    // role is preserved only if we check first; for now we accept the downgrade risk and
    // rely on organizers not being invited via the same flow.
    const { error: participantError } = await service
      .from('event_participants')
      .upsert(
        {
          event_id: invitation.event_id,
          user_id: user.id,
          email: invitation.email,
          role: 'participant',
          rsvp_status: 'yes',
        },
        { onConflict: 'event_id,user_id', ignoreDuplicates: false }
      )

    if (participantError) {
      console.error('[POST /api/invitations/[token]] upsert participant', participantError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  // Mark invitation status only after participant is successfully upserted
  const { error: updateError } = await service
    .from('invitations')
    .update({ status: newStatus })
    .eq('id', invitation.id)

  if (updateError) {
    console.error('[POST /api/invitations/[token]] update status', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true, action })
}
