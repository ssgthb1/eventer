'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, EventStatus } from '@/types'

type FormValues = {
  name: string
  description: string
  date: string
  location: string
  venue_notes: string
  budget: string
  status: EventStatus
}

interface EventFormProps {
  /** Pass an existing event to pre-fill the form for editing */
  event?: Event
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter()
  const isEdit = !!event

  const [values, setValues] = useState<FormValues>({
    name: event?.name ?? '',
    description: event?.description ?? '',
    // datetime-local requires YYYY-MM-DDTHH:MM — Supabase stores ISO 8601 timestamptz
    date: event?.date ? event.date.slice(0, 16) : '',
    location: event?.location ?? '',
    venue_notes: event?.venue_notes ?? '',
    budget: event?.budget != null ? String(event.budget) : '',
    status: event?.status ?? 'active',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues(v => ({ ...v, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const rawBudget = values.budget !== '' ? parseFloat(values.budget) : undefined
    if (rawBudget !== undefined && (!isFinite(rawBudget) || rawBudget < 0)) {
      setError('Budget must be a valid non-negative number')
      setLoading(false)
      return
    }

    const payload = {
      name: values.name,
      description: values.description || undefined,
      date: values.date || undefined,
      location: values.location || undefined,
      venue_notes: values.venue_notes || undefined,
      budget: rawBudget,
      status: values.status,
    }

    try {
      const res = await fetch(
        isEdit ? `/api/events/${event!.id}` : '/api/events',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
        return
      }

      router.push(`/events/${json.event.id}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
          Event name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          maxLength={200}
          value={values.name}
          onChange={set('name')}
          placeholder="Summer BBQ"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          maxLength={2000}
          value={values.description}
          onChange={set('description')}
          placeholder="What's the occasion?"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Date + Status row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
            Date & time
          </label>
          <input
            id="date"
            type="datetime-local"
            value={values.date}
            onChange={set('date')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={values.status}
            onChange={set('status')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
          Location
        </label>
        <input
          id="location"
          type="text"
          maxLength={300}
          value={values.location}
          onChange={set('location')}
          placeholder="Central Park, New York"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Venue notes */}
      <div>
        <label htmlFor="venue_notes" className="block text-sm font-medium text-slate-700 mb-1">
          Venue notes
        </label>
        <textarea
          id="venue_notes"
          rows={2}
          maxLength={1000}
          value={values.venue_notes}
          onChange={set('venue_notes')}
          placeholder="Parking info, access codes, etc."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Budget */}
      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-slate-700 mb-1">
          Budget (USD)
        </label>
        <input
          id="budget"
          type="number"
          min="0"
          step="0.01"
          value={values.budget}
          onChange={set('budget')}
          placeholder="500.00"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
