'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui'

interface SettleButtonProps {
  expenseId: string
  participantId: string
  onSettled: () => void
}

export function SettleButton({ expenseId, participantId, onSettled }: SettleButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSettle() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/expenses/${expenseId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to settle')
        setConfirming(false)
      } else {
        onSettled()
      }
    } catch {
      setError('Network error — please try again')
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-xs text-red-500">{error}</span>
        <Button variant="ghost" size="xs" onClick={() => setError(null)}>
          Dismiss
        </Button>
      </span>
    )
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <Button
          variant="success"
          size="xs"
          loading={loading}
          loadingText="Settling…"
          onClick={handleSettle}
        >
          Confirm
        </Button>
        <Button variant="ghost" size="xs" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
      </span>
    )
  }

  return (
    <Button variant="secondary" size="xs" leftIcon={<Check />} onClick={() => setConfirming(true)}>
      Settle
    </Button>
  )
}
