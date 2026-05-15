// Pure presentation logic for event screens — extracted from rendering so it
// can be unit-tested without React Native. Mirrors the derivations the web
// event-detail page does inline.

import type { EventStatus } from '@eventer/shared'

import type { Accent } from './theme'

export function statusAccent(status: EventStatus | string): Accent {
  switch (status) {
    case 'active':
      return 'success'
    case 'completed':
      return 'info'
    case 'draft':
    default:
      return 'neutral'
  }
}

export type BudgetView = {
  /** True when the event has a budget set. */
  set: boolean
  /** True when spend exceeds the budget. */
  over: boolean
  /** 0–100 fill percentage for the progress bar. */
  pct: number
  /** Signed delta: positive = remaining, negative = over budget. */
  delta: number
}

export function budgetView(budget: number | null | undefined, spent: number): BudgetView {
  if (budget == null) {
    return { set: false, over: false, pct: 0, delta: 0 }
  }
  const over = spent > budget
  // Show a full bar when over budget; guard divide-by-zero when budget is 0.
  const pct = over ? 100 : budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  return { set: true, over, pct, delta: budget - spent }
}

export function taskProgressPct(done: number, total: number): number {
  if (total <= 0) return 0
  return Math.min((done / total) * 100, 100)
}

/** "1 expense" / "3 expenses" / "0 expenses". */
export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
