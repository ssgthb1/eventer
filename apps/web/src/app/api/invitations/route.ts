import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInviteEmail, sendInviteSms } from '@/lib/notifications'

/** Basic RFC 5322-compatible email check. */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** E.164 phone number check. */
function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { event_id?: string; email?: string; phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { event_id, email, phone } = body

  if (!event_id) return NextResponse.json({ error: 'event_id is required' }, { status: 400 })

  const cleanEmail = email?.trim() || null
  const cleanPhone = phone?.trim() || null

  if (!cleanEmail && !cleanPhone) {
    return NextResponse.json({ error: 'email or phone is required' }, { status: 400 })
  }
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (cleanPhone && !isValidPhone(cleanPhone)) {
    return NextResponse.json({ error: 'Phone must be in E.164 format (e.g. +15550001234)' }, { status: 400 })
  }

  // Verify event exists and caller is organizer/creator
  const [{ data: event }, { data: myParticipant }] = await Promise.all([
    supabase.from('events').select('id, name, date, created_by').eq('id', event_id).single(),
    supabase.from('event_participants').select('role').eq('event_id', event_id).eq('user_id', user.id).single(),
  ])

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const isCreator = event.created_by === user.id
  if (!isCreator && myParticipant?.role !== 'organizer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit: max 20 invitations per user per event per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await supabase
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event_id)
    .eq('invited_by', user.id)
    .gte('created_at', oneHourAgo)

  if ((recentCount ?? 0) >= 20) {
    return NextResponse.json(
      { error: 'Too many invitations sent recently. Please wait before sending more.' },
      { status: 429 }
    )
  }

  // Prevent duplicate pending invitations for the same recipient
  if (cleanEmail) {
    const { data: existing } = await supabase
      .from('invitations')
      .select('id')
      .eq('event_id', event_id)
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A pending invitation already exists for this email' }, { status: 409 })
    }
  }

  if (cleanPhone) {
    const { data: existing } = await supabase
      .from('invitations')
      .select('id')
      .eq('event_id', event_id)
      .eq('phone', cleanPhone)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A pending invitation already exists for this phone number' }, { status: 409 })
    }
  }

  // Fetch inviter's name for the notification
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const inviterName = inviterProfile?.full_name ?? 'Someone'

  // Create invitation record
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      event_id,
      invited_by: user.id,
      email: cleanEmail,
      phone: cleanPhone,
    })
    .select('id')
    .single()

  if (inviteError) {
    console.error('[POST /api/invitations] create invitation', inviteError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Fetch token separately (don't return it to caller — token was already sent in notification)
  const { data: tokenRow } = await supabase
    .from('invitations')
    .select('token')
    .eq('id', invitation.id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const acceptUrl = `${appUrl}/invite/${tokenRow?.token}`

  // Send notification — failures are logged but don't fail the response
  if (cleanEmail) {
    try {
      await sendInviteEmail({
        to: cleanEmail,
        inviterName,
        eventName: event.name,
        eventDate: event.date,
        acceptUrl,
      })
    } catch (err) {
      console.error('[POST /api/invitations] send email', err)
    }
  }

  if (cleanPhone) {
    try {
      await sendInviteSms({
        to: cleanPhone,
        inviterName,
        eventName: event.name,
        acceptUrl,
      })
    } catch (err) {
      console.error('[POST /api/invitations] send SMS', err)
    }
  }

  // Return only the id — token is not exposed to the caller
  return NextResponse.json({ invitation: { id: invitation.id } }, { status: 201 })
}
