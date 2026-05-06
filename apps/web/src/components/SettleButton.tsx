'use client'

import { useState } from 'react'

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
      <span className="flex items-center gap-1.5 text-xs">
        <span className="text-red-500">{error}</span>
        <button onClick={() => setError(null)} className="text-slate-400 hover:underline">
          Dismiss
        </button>
      </span>
    )
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={handleSettle}
          disabled={loading}
          className="text-xs text-green-600 hover:underline disabled:opacity-50"
        >
          {loading ? 'Settling…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs text-slate-400 hover:underline"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-indigo-500 hover:underline"
    >
      Settle
    </button>
  )
}
