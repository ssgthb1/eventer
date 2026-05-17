// Pure presentation logic for event screens — extracted from rendering so it
// can be unit-tested without React Native. Mirrors the derivations the web
// event-detail page does inline.

import type { EventStatus, RsvpStatus, TaskStatus } from '@eventer/shared'

import { formatCurrency } from './format'
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

const RSVP: Record<RsvpStatus, { label: string; accent: Accent }> = {
  yes: { label: 'Going', accent: 'success' },
  maybe: { label: 'Maybe', accent: 'warning' },
  no: { label: "Can't go", accent: 'danger' },
  pending: { label: 'Pending', accent: 'neutral' },
}

export function rsvpPresenter(status: RsvpStatus | string): {
  label: string
  accent: Accent
} {
  return RSVP[status as RsvpStatus] ?? RSVP.pending
}

/** RSVP options a user can actively pick (excludes the default 'pending'). */
export const RSVP_CHOICES: { value: Exclude<RsvpStatus, 'pending'>; label: string }[] = [
  { value: 'yes', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: "Can't go" },
]

type NameParts = {
  display_name: string | null
  email: string | null
  phone: string | null
  profiles: { full_name: string | null }[] | null
}

/**
 * Resolve a participant's display name with the same precedence as the web
 * ParticipantsList: linked profile name → organizer-typed display name →
 * email → phone → "Unknown".
 */
export function participantName(p: NameParts): string {
  return p.profiles?.[0]?.full_name || p.display_name || p.email || p.phone || 'Unknown'
}

/**
 * Name precedence for an expense split's participant. Mirrors the web
 * ExpenseList (display_name first, then linked profile) — distinct from
 * participantName's profile-first order, kept identical on purpose.
 */
export function splitName(
  p: { display_name: string | null; profiles: { full_name: string | null }[] | null } | null,
): string {
  if (!p) return 'Unknown'
  return p.display_name || p.profiles?.[0]?.full_name || 'Unknown'
}

export type NetTone = 'positive' | 'negative' | 'muted'

/**
 * Per-participant net balance display. Matches web BalanceSummary:
 * |net| < 0.005 → "even"; positive → "+$x" (others owe you); negative →
 * "-$x" (you owe).
 */
export function netBalanceView(net: number): { label: string; tone: NetTone } {
  if (Math.abs(net) < 0.005) return { label: 'even', tone: 'muted' }
  if (net > 0) return { label: `+${formatCurrency(net)}`, tone: 'positive' }
  return { label: `-${formatCurrency(Math.abs(net))}`, tone: 'negative' }
}

type SettleExpense = { expense_splits: { is_settled: boolean }[] }

/**
 * True when there is at least one split and every split is settled with no
 * outstanding transfers — the "All debts settled!" state from web.
 */
export function allDebtsSettled(
  expenses: SettleExpense[],
  settlementCount: number,
): boolean {
  const hasAnySplit = expenses.some((e) => e.expense_splits.length > 0)
  return (
    settlementCount === 0 &&
    hasAnySplit &&
    expenses.every((e) => e.expense_splits.every((s) => s.is_settled))
  )
}

// ─── Task board ───────────────────────────────────────────────

const TASK_STATUS: Record<TaskStatus, { label: string; accent: Accent }> = {
  open: { label: 'Open', accent: 'neutral' },
  in_progress: { label: 'In progress', accent: 'warning' },
  done: { label: 'Done', accent: 'success' },
}

/** Ordered columns for the board. */
export const TASK_COLUMNS: TaskStatus[] = ['open', 'in_progress', 'done']

export function taskStatusMeta(status: TaskStatus): { label: string; accent: Accent } {
  return TASK_STATUS[status] ?? TASK_STATUS.open
}

const NEXT: Record<TaskStatus, TaskStatus | null> = {
  open: 'in_progress',
  in_progress: 'done',
  done: null,
}
const PREV: Record<TaskStatus, TaskStatus | null> = {
  open: null,
  in_progress: 'open',
  done: 'in_progress',
}

export function nextTaskStatus(status: TaskStatus): TaskStatus | null {
  return NEXT[status] ?? null
}
export function prevTaskStatus(status: TaskStatus): TaskStatus | null {
  return PREV[status] ?? null
}

/**
 * Due-date display. Compares date-only strings at the UTC boundary (same as
 * the web TaskBoard) to avoid timezone off-by-one. `today` is injectable for
 * tests; it defaults to the current UTC date (YYYY-MM-DD).
 */
export function dueDateView(
  dueDate: string | null,
  status: TaskStatus,
  today: string = new Date().toISOString().slice(0, 10),
): { label: string; overdue: boolean } | null {
  if (!dueDate) return null
  const d = new Date(`${dueDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  const overdue = status !== 'done' && dueDate < today
  const formatted = d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return { label: `Due ${formatted}${overdue ? ' · Overdue' : ''}`, overdue }
}

/**
 * Assignee line text. Mirrors web TaskBoard: your own → "Assigned to you";
 * someone else → their name (or "Someone" if the join name is missing);
 * unassigned → null (caller shows an "Assign to me" affordance instead).
 */
export function assigneeLabel(
  assignee: { full_name: string | null }[] | null,
  isAssignedToMe: boolean,
  isAssigned: boolean,
): string | null {
  if (isAssignedToMe) return 'Assigned to you'
  if (isAssigned) return assignee?.[0]?.full_name || 'Someone'
  return null
}
