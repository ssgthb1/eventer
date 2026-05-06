'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AcceptInviteButtonProps {
  token: string
  eventId: string
}

export function AcceptInviteButton({ token, eventId }: AcceptInviteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(action: 'accept' | 'decline') {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
      } else if (action === 'accept') {
        router.push(`/events/${eventId}`)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(null)
      setConfirmDecline(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
      <button
        onClick={() => handleAction('accept')}
        disabled={loading !== null}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
      >
        {loading === 'accept' ? 'Accepting…' : 'Accept invitation'}
      </button>

      {!confirmDecline ? (
        <button
          onClick={() => setConfirmDecline(true)}
          disabled={loading !== null}
          className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-600 font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          Decline
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('decline')}
            disabled={loading !== null}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === 'decline' ? 'Declining…' : 'Yes, decline'}
          </button>
          <button
            onClick={() => setConfirmDecline(false)}
            disabled={loading !== null}
            className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-600 font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
