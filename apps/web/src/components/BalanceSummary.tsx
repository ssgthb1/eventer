'use client'

import { useState, useEffect, useCallback } from 'react'
import { calculateBalances } from '@/lib/expense-calculator'
import { formatCurrency } from '@/lib/utils'

type Participant = {
  id: string
  user_id: string | null
  display_name: string | null
  profiles: { full_name: string | null }[] | null
}

type Split = {
  participant_id: string
  amount_owed: number
  is_settled: boolean
}

type Expense = {
  paid_by: string
  amount: number
  expense_splits: Split[]
}

interface BalanceSummaryProps {
  eventId: string
  participants: Participant[]
  refreshKey?: number
}

export function BalanceSummary({ eventId, participants, refreshKey }: BalanceSummaryProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/expenses`)
      const json = await res.json()
      if (res.ok) {
        setExpenses(json.expenses ?? [])
        setError(null)
      } else {
        setError(json.error ?? 'Failed to load balances')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetch_() }, [fetch_, refreshKey])

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-400">
        Loading balances…
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-red-500">
        {error}
      </div>
    )
  }

  if (expenses.length === 0) return null

  const { balances, settlements } = calculateBalances(expenses, participants)
  const hasAnySplit = expenses.some(e => e.expense_splits.length > 0)
  const allSettled = settlements.length === 0 && hasAnySplit &&
    expenses.every(e => e.expense_splits.every(s => s.is_settled))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      <h3 className="text-sm font-semibold text-slate-900">Balance summary</h3>

      {/* Per-participant balances */}
      <div className="space-y-2">
        {balances.map(b => {
          const isEven = Math.abs(b.net) < 0.005
          return (
            <div key={b.participantId} className="flex items-center justify-between text-sm">
              <span className="text-slate-700 truncate">{b.name}</span>
              <span
                className={
                  isEven
                    ? 'text-slate-400'
                    : b.net > 0
                    ? 'text-green-600 font-medium'
                    : 'text-red-500 font-medium'
                }
              >
                {isEven
                  ? 'even'
                  : b.net > 0
                  ? `+${formatCurrency(b.net)}`
                  : `-${formatCurrency(Math.abs(b.net))}`}
              </span>
            </div>
          )
        })}
      </div>

      {/* Settlement plan */}
      {allSettled ? (
        <p className="text-xs text-green-600">All debts settled!</p>
      ) : (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">To settle up:</p>
          <div className="space-y-1.5">
            {settlements.map(s => (
              <div key={`${s.fromParticipantId}-${s.toParticipantId}`} className="flex items-center gap-1.5 text-xs text-slate-700">
                <span className="font-medium">{s.fromName}</span>
                <span className="text-slate-400">owes</span>
                <span className="font-medium">{s.toName}</span>
                <span className="ml-auto font-semibold text-slate-900">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
