'use client'

import { useState } from 'react'
import type { RsvpStatus } from '@/types'

const OPTIONS: { value: RsvpStatus; label: string; active: string; inactive: string }[] = [
  { value: 'yes',   label: 'Going',    active: 'bg-green-600 text-white',  inactive: 'border border-slate-300 text-slate-600 hover:bg-green-50 hover:border-green-300' },
  { value: 'maybe', label: 'Maybe',    active: 'bg-yellow-500 text-white', inactive: 'border border-slate-300 text-slate-600 hover:bg-yellow-50 hover:border-yellow-300' },
  { value: 'no',    label: "Can't go", active: 'bg-red-500 text-white',    inactive: 'border border-slate-300 text-slate-600 hover:bg-red-50 hover:border-red-300' },
]

interface RSVPButtonProps {
  eventId: string
  participantId: string
  currentStatus: RsvpStatus
}

export function RSVPButton({ eventId, participantId, currentStatus }: RSVPButtonProps) {
  const [status, setStatus] = useState<RsvpStatus>(currentStatus)
  const [loading, setLoading] = useState<RsvpStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRSVP(newStatus: RsvpStatus) {
    if (newStatus === status) return
    setLoading(newStatus)
    setError(null)
    try {
      const res = await fetch(
        `/api/events/${eventId}/participants/${participantId}/rsvp`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rsvp_status: newStatus }),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to update RSVP')
      } else {
        setStatus(json.participant.rsvp_status)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleRSVP(opt.value)}
            disabled={loading !== null}
            aria-pressed={status === opt.value}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              status === opt.value ? opt.active : opt.inactive
            }`}
          >
            {loading === opt.value ? '…' : opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
