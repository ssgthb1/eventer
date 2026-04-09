'use client'

import { useState } from 'react'

interface InviteFormProps {
  eventId: string
}

type Channel = 'email' | 'sms'

export function InviteForm({ eventId }: InviteFormProps) {
  const [channel, setChannel] = useState<Channel>('email')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          email: channel === 'email' ? value.trim() : undefined,
          phone: channel === 'sms' ? value.trim() : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to send invitation')
      } else {
        setSuccess(true)
        setValue('')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Send invitation</h3>

      {/* Channel toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-3 w-fit">
        {(['email', 'sms'] as Channel[]).map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => { setChannel(ch); setValue(''); setError(null); setSuccess(false) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              channel === ch
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {ch === 'email' ? 'Email' : 'SMS'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type={channel === 'email' ? 'email' : 'tel'}
          placeholder={channel === 'email' ? 'friend@example.com' : '+1 555 000 0000'}
          value={value}
          onChange={e => { setValue(e.target.value); setError(null) }}
          maxLength={254}
          required
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {success && <p className="text-xs text-green-600 mt-2">Invitation sent!</p>}
    </form>
  )
}
