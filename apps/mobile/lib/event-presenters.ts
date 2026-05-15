// Pure presentation logic for event screens — extracted from rendering so it
// can be unit-tested without React Native. Mirrors the derivations the web
// event-detail page does inline.

import type { EventStatus, RsvpStatus } from '@eventer/shared'

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
