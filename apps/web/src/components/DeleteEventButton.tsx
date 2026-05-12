'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to delete event')
        setConfirming(false)
        return
      }
      router.push('/events')
      router.refresh()
    } catch {
      setError('Network error — please try again')
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <span className="text-xs text-red-500">{error}</span>
  }

  if (confirming) {
    return (
      <div className="flex gap-2 items-center">
        <span className="text-xs text-slate-500">Delete?</span>
        <Button
          variant="danger"
          size="sm"
          loading={loading}
          loadingText="Deleting…"
          onClick={handleDelete}
        >
          Yes, delete
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button variant="dangerOutline" size="sm" leftIcon={<Trash2 />} onClick={() => setConfirming(true)}>
      Delete
    </Button>
  )
}
