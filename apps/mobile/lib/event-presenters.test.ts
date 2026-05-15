import { describe, it, expect } from 'vitest'

import { statusAccent, budgetView, taskProgressPct, pluralize } from './event-presenters'

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
