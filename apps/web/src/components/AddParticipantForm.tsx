'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui'

interface AddParticipantFormProps {
  eventId: string
}

export function AddParticipantForm({ eventId }: AddParticipantFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const trimmedEmail = email.trim()
  const trimmedPhone = phone.trim()
  const trimmedDisplay = displayName.trim()
  const hasAnyInput = trimmedEmail !== '' || trimmedPhone !== '' || trimmedDisplay !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasAnyInput) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          display_name: trimmedDisplay || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to add participant')
      } else {
        setEmail('')
        setPhone('')
        setDisplayName('')
        setSuccess(
          trimmedEmail || trimmedPhone
            ? "Added. They'll see this event when they sign in with the matching account."
            : 'Added.',
        )
        router.refresh()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900">Add participant</h3>
      <p className="text-xs text-slate-500 mt-1 mb-4">
        Add by email or phone — they&apos;ll be linked automatically when they sign in.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={32}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      {success && <p className="text-xs text-green-600 mb-3">{success}</p>}
      <Button
        type="submit"
        disabled={!hasAnyInput}
        loading={loading}
        loadingText="Adding…"
        leftIcon={<UserPlus />}
      >
        Add
      </Button>
    </form>
  )
}
