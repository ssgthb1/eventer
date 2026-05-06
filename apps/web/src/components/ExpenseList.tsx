'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseForm, type Participant, type ExpenseData } from './ExpenseForm'
import { SettleButton } from './SettleButton'

export type Split = {
  id: string
  amount_owed: number
  is_settled: boolean
  participant_id: string
  event_participants: {
    id: string
    user_id: string | null
    display_name: string | null
    profiles: { full_name: string | null }[] | null
  } | null
}

export type Expense = {
  id: string
  description: string
  amount: number
  paid_by: string
  split_type: 'equal' | 'custom'
  created_at: string
  payer: { full_name: string | null; avatar_url: string | null }[] | null
  expense_splits: Split[]
}

interface ExpenseListProps {
  eventId: string
  initialExpenses: Expense[]
  participants: Participant[]
  currentUserId: string
  isOrganizer: boolean
  onMutated?: () => void
}

function participantName(p: { display_name: string | null; profiles: { full_name: string | null }[] | null } | null) {
  if (!p) return 'Unknown'
  return p.display_name || p.profiles?.[0]?.full_name || 'Unknown'
}

export function ExpenseList({ eventId, initialExpenses, participants, currentUserId, isOrganizer, onMutated }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      const res = await fetch(`/api/events/${eventId}/expenses`)
      const json = await res.json()
      if (res.ok) {
        setExpenses(json.expenses ?? [])
        onMutated?.()
      } else {
        setError(json.error ?? 'Failed to refresh expenses')
      }
    } catch {
      setError('Network error — could not refresh expenses')
    }
  }

  async function handleDelete(expenseId: string) {
    setDeletingId(expenseId)
    setError(null)
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to delete')
      } else {
        setExpenses(prev => prev.filter(e => e.id !== expenseId))
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {formatCurrency(totalExpenses)} total
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null) }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add expense
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add form */}
      {showForm && (
        <ExpenseForm
          eventId={eventId}
          participants={participants}
          onSuccess={async () => { setShowForm(false); await refresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Expense cards */}
      {expenses.length === 0 && !showForm && (
        <div className="text-center py-10 text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">
          No expenses yet. Add the first one!
        </div>
      )}

      {expenses.map(expense => {
        const canEdit = expense.paid_by === currentUserId || isOrganizer
        const isEditing = editingId === expense.id

        if (isEditing) {
          const expenseData: ExpenseData = {
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            paid_by: expense.paid_by,
            split_type: expense.split_type,
            expense_splits: expense.expense_splits.map(s => ({
              participant_id: s.participant_id,
              amount_owed: s.amount_owed,
            })),
          }
          return (
            <ExpenseForm
              key={expense.id}
              eventId={eventId}
              participants={participants}
              expense={expenseData}
              onSuccess={async () => { setEditingId(null); await refresh() }}
              onCancel={() => setEditingId(null)}
            />
          )
        }

        return (
          <div key={expense.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{expense.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paid by {expense.payer?.[0]?.full_name ?? 'Unknown'} · {formatDate(expense.created_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
                <p className="text-xs text-slate-400 capitalize">{expense.split_type} split</p>
              </div>
            </div>

            {/* Splits breakdown */}
            {expense.expense_splits.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                {expense.expense_splits.map(split => {
                  const canSettle = !split.is_settled && (expense.paid_by === currentUserId || isOrganizer)
                  return (
                    <div key={split.id} className="flex items-center justify-between text-xs text-slate-600 gap-2">
                      <span className={split.is_settled ? 'line-through text-slate-400' : ''}>
                        {participantName(split.event_participants)}
                      </span>
                      <span className="flex items-center gap-2 ml-auto shrink-0">
                        <span className={split.is_settled ? 'text-slate-400' : ''}>
                          {formatCurrency(split.amount_owed)}
                          {split.is_settled && <span className="ml-1 text-green-600">✓</span>}
                        </span>
                        {canSettle && (
                          <SettleButton
                            expenseId={expense.id}
                            participantId={split.participant_id}
                            onSettled={refresh}
                          />
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            {canEdit && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => { setEditingId(expense.id); setShowForm(false) }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Edit
                </button>
                {confirmDeleteId === expense.id ? (
                  <span className="text-xs text-slate-600 ml-auto flex items-center gap-2">
                    Delete this expense?
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={deletingId === expense.id}
                      className="text-red-500 hover:underline"
                    >
                      {deletingId === expense.id ? 'Deleting…' : 'Yes'}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 hover:underline">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(expense.id)}
                    className="text-xs text-red-400 hover:underline ml-auto"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
