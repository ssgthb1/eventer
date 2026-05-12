'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { RSVPButton } from './RSVPButton'
import type { RsvpStatus, ParticipantRole } from '@/types'

interface Participant {
  id: string
  user_id: string | null
  email: string | null
  display_name: string | null
  role: ParticipantRole
  rsvp_status: RsvpStatus
  joined_at: string
  profiles: { full_name: string | null; avatar_url: string | null }[] | null
}

interface ParticipantsListProps {
  eventId: string
  initialParticipants: Participant[]
  currentUserId: string
  isOrganizer: boolean
  myParticipantId?: string
  myRsvpStatus?: RsvpStatus
}

const RSVP_BADGE: Record<RsvpStatus, string> = {
  yes:     'bg-green-100 text-green-700',
  maybe:   'bg-yellow-100 text-yellow-700',
  no:      'bg-red-100 text-red-700',
  pending: 'bg-slate-100 text-slate-500',
}

const RSVP_LABEL: Record<RsvpStatus, string> = {
  yes: 'Going', maybe: 'Maybe', no: "Can't go", pending: 'Pending',
}

export function ParticipantsList({
  eventId,
  initialParticipants,
  currentUserId,
  isOrganizer,
  myParticipantId,
  myRsvpStatus,
}: ParticipantsListProps) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRemove(participantId: string) {
    setRemoving(participantId)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'DELETE',
      })
      if (res.status === 204) {
        setParticipants(prev => prev.filter(p => p.id !== participantId))
      } else {
        const json = await res.json()
        setError(json.error ?? 'Failed to remove participant')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setRemoving(null)
    }
  }

  if (!participants.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
        No participants yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      {participants.map((p) => {
        const name = p.profiles?.[0]?.full_name ?? p.display_name ?? p.email ?? 'Unknown'
        const avatar = p.profiles?.[0]?.avatar_url
        const initials = name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
        const isSelf = p.user_id === currentUserId
        const canRemove = isOrganizer || isSelf

        return (
          <div
            key={p.id}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-3">
              {avatar ? (
                <Image src={avatar} alt="" width={36} height={36} className="rounded-full" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-xs">
                  {initials}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{name}</p>
                  {p.role === 'organizer' && (
                    <span className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium">
                      Organizer
                    </span>
                  )}
                  {isSelf && (
                    <span className="text-xs text-slate-400">(you)</span>
                  )}
                </div>
                {p.email && !p.profiles && (
                  <p className="text-xs text-slate-400">{p.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              {/* RSVP button for own record; badge for others */}
              {isSelf && myParticipantId ? (
                <RSVPButton
                  eventId={eventId}
                  participantId={myParticipantId}
                  currentStatus={myRsvpStatus ?? p.rsvp_status}
                />
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RSVP_BADGE[p.rsvp_status]}`}>
                  {RSVP_LABEL[p.rsvp_status]}
                </span>
              )}

              {/* Remove button */}
              {canRemove && (
                <IconButton
                  variant="danger"
                  size="sm"
                  aria-label={`Remove ${name}`}
                  disabled={removing === p.id}
                  onClick={() => handleRemove(p.id)}
                >
                  {removing === p.id ? (
                    <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <X />
                  )}
                </IconButton>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
