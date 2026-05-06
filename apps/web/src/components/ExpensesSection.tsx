'use client'

import { useState } from 'react'
import { BalanceSummary } from './BalanceSummary'
import { ExpenseList, type Expense } from './ExpenseList'
import type { Participant } from './ExpenseForm'

interface ExpensesSectionProps {
  eventId: string
  participants: Participant[]
  currentUserId: string
  isOrganizer: boolean
  initialExpenses: Expense[]
}

export function ExpensesSection({
  eventId,
  participants,
  currentUserId,
  isOrganizer,
  initialExpenses,
}: ExpensesSectionProps) {
  const [summaryKey, setSummaryKey] = useState(0)

  return (
    <div className="space-y-4">
      <BalanceSummary
        eventId={eventId}
        participants={participants}
        refreshKey={summaryKey}
      />
      <ExpenseList
        eventId={eventId}
        initialExpenses={initialExpenses}
        participants={participants}
        currentUserId={currentUserId}
        isOrganizer={isOrganizer}
        onMutated={() => setSummaryKey(k => k + 1)}
      />
    </div>
  )
}
