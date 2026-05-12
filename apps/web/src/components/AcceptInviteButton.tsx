'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

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
      <Button
        size="lg"
        fullWidth
        loading={loading === 'accept'}
        loadingText="Accepting…"
        disabled={loading !== null}
        onClick={() => handleAction('accept')}
      >
        Accept invitation
      </Button>

      {!confirmDecline ? (
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={loading !== null}
          onClick={() => setConfirmDecline(true)}
        >
          Decline
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={loading === 'decline'}
            loadingText="Declining…"
            disabled={loading !== null}
            onClick={() => handleAction('decline')}
          >
            Yes, decline
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            disabled={loading !== null}
            onClick={() => setConfirmDecline(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
