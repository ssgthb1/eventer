import { describe, it, expect } from 'vitest'

import {
  statusAccent,
  budgetView,
  taskProgressPct,
  pluralize,
  rsvpPresenter,
  participantName,
  splitName,
  netBalanceView,
  allDebtsSettled,
  taskStatusMeta,
  nextTaskStatus,
  prevTaskStatus,
  dueDateView,
  assigneeLabel,
  TASK_COLUMNS,
} from './event-presenters'

describe('statusAccent', () => {
  it('maps known statuses', () => {
    expect(statusAccent('active')).toBe('success')
    expect(statusAccent('completed')).toBe('info')
    expect(statusAccent('draft')).toBe('neutral')
  })
  it('falls back to neutral for unknown values', () => {
    expect(statusAccent('archived')).toBe('neutral')
  })
})

describe('budgetView', () => {
  it('reports no budget when null', () => {
    expect(budgetView(null, 100)).toEqual({ set: false, over: false, pct: 0, delta: 0 })
  })
  it('computes remaining when under budget', () => {
    const v = budgetView(200, 50)
    expect(v.set).toBe(true)
    expect(v.over).toBe(false)
    expect(v.pct).toBe(25)
    expect(v.delta).toBe(150)
  })
  it('caps at 100% and flags over budget', () => {
    const v = budgetView(100, 250)
    expect(v.over).toBe(true)
    expect(v.pct).toBe(100)
    expect(v.delta).toBe(-150)
  })
  it('guards divide-by-zero when budget is 0', () => {
    const v = budgetView(0, 0)
    expect(v.over).toBe(false)
    expect(v.pct).toBe(0)
  })
  it('zero budget with spend is over budget at full bar', () => {
    const v = budgetView(0, 10)
    expect(v.over).toBe(true)
    expect(v.pct).toBe(100)
    expect(v.delta).toBe(-10)
  })
})

describe('taskProgressPct', () => {
  it('returns 0 when there are no tasks', () => {
    expect(taskProgressPct(0, 0)).toBe(0)
  })
  it('computes a percentage', () => {
    expect(taskProgressPct(1, 4)).toBe(25)
  })
  it('caps at 100', () => {
    expect(taskProgressPct(5, 4)).toBe(100)
  })
})

describe('pluralize', () => {
  it('singular for 1', () => {
    expect(pluralize(1, 'expense')).toBe('1 expense')
  })
  it('plural otherwise', () => {
    expect(pluralize(0, 'expense')).toBe('0 expenses')
    expect(pluralize(3, 'task')).toBe('3 tasks')
  })
})

describe('rsvpPresenter', () => {
  it('maps each status to label + accent', () => {
    expect(rsvpPresenter('yes')).toEqual({ label: 'Going', accent: 'success' })
    expect(rsvpPresenter('maybe')).toEqual({ label: 'Maybe', accent: 'warning' })
    expect(rsvpPresenter('no')).toEqual({ label: "Can't go", accent: 'danger' })
    expect(rsvpPresenter('pending')).toEqual({ label: 'Pending', accent: 'neutral' })
  })
  it('falls back to pending for unknown values', () => {
    expect(rsvpPresenter('garbage')).toEqual({ label: 'Pending', accent: 'neutral' })
  })
})

describe('participantName', () => {
  const base = { display_name: null, email: null, phone: null, profiles: null }

  it('prefers linked profile full_name', () => {
    expect(
      participantName({ ...base, display_name: 'Org Typed', profiles: [{ full_name: 'Real Name' }] }),
    ).toBe('Real Name')
  })
  it('falls back to display_name, then email, then phone', () => {
    expect(participantName({ ...base, display_name: 'Typed Name' })).toBe('Typed Name')
    expect(participantName({ ...base, email: 'a@b.com' })).toBe('a@b.com')
    expect(participantName({ ...base, phone: '+14155550100' })).toBe('+14155550100')
  })
  it('skips empty strings and null profile name', () => {
    expect(participantName({ ...base, profiles: [{ full_name: '' }], display_name: 'Fallback' })).toBe(
      'Fallback',
    )
    expect(participantName({ ...base, profiles: [{ full_name: null }], email: 'x@y.z' })).toBe('x@y.z')
  })
  it('falls through an empty profiles array (unlinked participant, no FK match)', () => {
    expect(participantName({ ...base, profiles: [], display_name: 'Invited Guest' })).toBe(
      'Invited Guest',
    )
  })
  it('returns Unknown when nothing is available', () => {
    expect(participantName(base)).toBe('Unknown')
  })
})

describe('splitName', () => {
  it('returns Unknown for null', () => {
    expect(splitName(null)).toBe('Unknown')
  })
  it('prefers display_name over linked profile (web ExpenseList order)', () => {
    expect(splitName({ display_name: 'Typed', profiles: [{ full_name: 'Profile' }] })).toBe('Typed')
  })
  it('falls back to profile full_name, then Unknown', () => {
    expect(splitName({ display_name: null, profiles: [{ full_name: 'Profile' }] })).toBe('Profile')
    expect(splitName({ display_name: null, profiles: null })).toBe('Unknown')
    expect(splitName({ display_name: null, profiles: [] })).toBe('Unknown')
  })
})

describe('netBalanceView', () => {
  it('treats near-zero as even', () => {
    expect(netBalanceView(0)).toEqual({ label: 'even', tone: 'muted' })
    expect(netBalanceView(0.004)).toEqual({ label: 'even', tone: 'muted' })
    expect(netBalanceView(-0.004)).toEqual({ label: 'even', tone: 'muted' })
  })
  it('formats a positive net as +$ (others owe you)', () => {
    expect(netBalanceView(12.5)).toEqual({ label: '+$12.50', tone: 'positive' })
  })
  it('formats a negative net as -$ (you owe)', () => {
    expect(netBalanceView(-7)).toEqual({ label: '-$7.00', tone: 'negative' })
  })
})

describe('allDebtsSettled', () => {
  const split = (is_settled: boolean) => ({ is_settled })

  it('false when there are no splits at all', () => {
    expect(allDebtsSettled([{ expense_splits: [] }], 0)).toBe(false)
  })
  it('false when settlements remain', () => {
    expect(allDebtsSettled([{ expense_splits: [split(true)] }], 1)).toBe(false)
  })
  it('false when any split is unsettled', () => {
    expect(
      allDebtsSettled([{ expense_splits: [split(true), split(false)] }], 0),
    ).toBe(false)
  })
  it('true when every split is settled and nothing is owed', () => {
    expect(
      allDebtsSettled(
        [{ expense_splits: [split(true)] }, { expense_splits: [split(true), split(true)] }],
        0,
      ),
    ).toBe(true)
  })
})

describe('taskStatusMeta', () => {
  it('maps each status', () => {
    expect(taskStatusMeta('open')).toEqual({ label: 'Open', accent: 'neutral' })
    expect(taskStatusMeta('in_progress')).toEqual({ label: 'In progress', accent: 'warning' })
    expect(taskStatusMeta('done')).toEqual({ label: 'Done', accent: 'success' })
  })
})

describe('next/prevTaskStatus', () => {
  it('walks the pipeline forward', () => {
    expect(nextTaskStatus('open')).toBe('in_progress')
    expect(nextTaskStatus('in_progress')).toBe('done')
    expect(nextTaskStatus('done')).toBeNull()
  })
  it('walks the pipeline backward', () => {
    expect(prevTaskStatus('done')).toBe('in_progress')
    expect(prevTaskStatus('in_progress')).toBe('open')
    expect(prevTaskStatus('open')).toBeNull()
  })
})

describe('dueDateView', () => {
  it('returns null with no due date or an unparseable one', () => {
    expect(dueDateView(null, 'open')).toBeNull()
    expect(dueDateView('not-a-date', 'open')).toBeNull()
  })
  it('formats a UTC date label', () => {
    expect(dueDateView('2026-05-20', 'open', '2026-05-15')).toEqual({
      label: 'Due May 20, 2026',
      overdue: false,
    })
  })
  it('flags overdue when past and not done', () => {
    expect(dueDateView('2026-05-10', 'in_progress', '2026-05-15')).toEqual({
      label: 'Due May 10, 2026 · Overdue',
      overdue: true,
    })
  })
  it('never overdue when the task is done', () => {
    expect(dueDateView('2026-05-10', 'done', '2026-05-15')).toEqual({
      label: 'Due May 10, 2026',
      overdue: false,
    })
  })
  it('not overdue on the due date itself (UTC boundary)', () => {
    expect(dueDateView('2026-05-15', 'open', '2026-05-15')?.overdue).toBe(false)
  })
  it('formats at the UTC year/day boundary (no local-timezone off-by-one)', () => {
    // Jan 1 would render as "Dec 31, <prev year>" if formatted in any
    // negative-UTC-offset local zone without the timeZone:'UTC' guard.
    expect(dueDateView('2026-01-01', 'open', '2025-12-31')).toEqual({
      label: 'Due Jan 1, 2026',
      overdue: false,
    })
    // Dec 31 must not bleed into the next year either.
    expect(dueDateView('2025-12-31', 'open', '2025-12-30')).toEqual({
      label: 'Due Dec 31, 2025',
      overdue: false,
    })
  })
  it('uses the current UTC date when today is not injected', () => {
    const todayUtc = new Date().toISOString().slice(0, 10)
    // A far-future due date can never be overdue against real "now".
    expect(dueDateView('2999-01-01', 'open')?.overdue).toBe(false)
    // A long-past due date is always overdue against real "now".
    expect(dueDateView('2000-01-01', 'open')?.overdue).toBe(true)
    // Today's UTC date itself is the boundary: not overdue.
    expect(dueDateView(todayUtc, 'open')?.overdue).toBe(false)
  })
})

describe('TASK_COLUMNS', () => {
  it('is the ordered open → in_progress → done pipeline (web parity)', () => {
    expect(TASK_COLUMNS).toEqual(['open', 'in_progress', 'done'])
  })
})

describe('assigneeLabel', () => {
  it('"Assigned to you" when it is mine', () => {
    expect(assigneeLabel(null, true, true)).toBe('Assigned to you')
  })
  it('shows the assignee name, falling back to "Someone"', () => {
    expect(assigneeLabel([{ full_name: 'Dana' }], false, true)).toBe('Dana')
    expect(assigneeLabel(null, false, true)).toBe('Someone')
    expect(assigneeLabel([{ full_name: null }], false, true)).toBe('Someone')
  })
  it('null when unassigned', () => {
    expect(assigneeLabel(null, false, false)).toBeNull()
  })
})
