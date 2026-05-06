'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

export type Participant = {
  id: string
  user_id: string | null
  display_name: string | null
  profiles: { full_name: string | null }[] | null
}

type SplitType = 'equal' | 'custom'

export type ExpenseData = {
  id: string
  description: string
  amount: number
  paid_by: string
  split_type: SplitType
  expense_splits: { participant_id: string; amount_owed: number }[]
}

interface ExpenseFormProps {
  eventId: string
  participants: Participant[]
  expense?: ExpenseData
  onSuccess: () => void
  onCancel: () => void
}

function participantName(p: Participant) {
  return p.display_name || p.profiles?.[0]?.full_name || 'Unknown'
}

export function ExpenseForm({ eventId, participants, expense, onSuccess, onCancel }: ExpenseFormProps) {
  const isEdit = !!expense

  // Only participants with a real user account can be the payer
  const eligiblePayers = participants.filter(p => p.user_id)

  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? eligiblePayers[0]?.user_id ?? '')
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? 'equal')
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(() => {
    if (expense?.split_type === 'custom') {
      return Object.fromEntries(expense.expense_splits.map(s => [s.participant_id, String(s.amount_owed)]))
    }
    return Object.fromEntries(participants.map(p => [p.id, '']))
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Track previous splitType to detect the moment of switching to 'custom'
  const prevSplitTypeRef = useRef<SplitType>(expense?.split_type ?? 'equal')

  const parsedAmount = parseFloat(amount) || 0

  // Auto-fill equal amounts only when the user switches TO custom split
  useEffect(() => {
    const justSwitchedToCustom = splitType === 'custom' && prevSplitTypeRef.current !== 'custom'
    prevSplitTypeRef.current = splitType
    if (justSwitchedToCustom && parsedAmount > 0) {
      const totalCents = Math.round(parsedAmount * 100)
      const shareCents = Math.floor(totalCents / participants.length)
      const remainderCents = totalCents - shareCents * participants.length
      setCustomSplits(
        Object.fromEntries(
          participants.map((p, i) => [
            p.id,
            ((shareCents + (i === participants.length - 1 ? remainderCents : 0)) / 100).toFixed(2),
          ])
        )
      )
    }
  }, [splitType, parsedAmount, participants])

  const customTotal = Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const customValid = splitType !== 'custom' || Math.abs(customTotal - parsedAmount) <= 0.01

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!customValid) {
      setError(`Custom splits total ${formatCurrency(customTotal)} but expense is ${formatCurrency(parsedAmount)}`)
      return
    }

    const splits =
      splitType === 'custom'
        ? participants.map(p => ({ participant_id: p.id, amount_owed: parseFloat(customSplits[p.id] ?? '0') || 0 }))
        : undefined

    setLoading(true)
    try {
      const url = isEdit ? `/api/expenses/${expense.id}` : `/api/events/${eventId}/expenses`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount: parsedAmount, paid_by: paidBy, split_type: splitType, splits }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
      } else {
        onSuccess()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">{isEdit ? 'Edit expense' : 'Add expense'}</h3>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Dinner at Nobu"
          maxLength={200}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Amount ($)</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Paid by */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Paid by</label>
        <select
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {eligiblePayers.map(p => (
            <option key={p.user_id} value={p.user_id!}>
              {participantName(p)}
            </option>
          ))}
        </select>
      </div>

      {/* Split type */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Split</label>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {(['equal', 'custom'] as SplitType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                splitType === type
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type === 'equal' ? 'Equal' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom splits */}
      {splitType === 'custom' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Enter how much each person owes:</p>
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{participantName(p)}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  value={customSplits[p.id] ?? ''}
                  onChange={e => setCustomSplits(prev => ({ ...prev, [p.id]: e.target.value }))}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}
          <p className={`text-xs mt-1 ${customValid ? 'text-green-600' : 'text-red-500'}`}>
            Total: {formatCurrency(customTotal)} / {formatCurrency(parsedAmount)}
          </p>
        </div>
      )}

      {/* Equal split preview */}
      {splitType === 'equal' && parsedAmount > 0 && (
        <p className="text-xs text-slate-500">
          {formatCurrency(parsedAmount / participants.length)} per person ({participants.length} participants)
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading || !customValid}
          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add expense')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
