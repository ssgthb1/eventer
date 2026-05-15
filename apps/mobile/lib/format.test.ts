import { describe, it, expect } from 'vitest'

import { formatCurrency, formatDate, formatDateTime, initials } from './format'

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
  it('formats negative amounts', () => {
    expect(formatCurrency(-42)).toBe('-$42.00')
  })
})

describe('formatDate', () => {
  it('returns an em dash for null/undefined/empty', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
  it('returns an em dash for an unparseable date', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })
  it('formats an ISO date', () => {
    expect(formatDate('2026-05-15T00:00:00Z')).toMatch(/May \d{1,2}, 2026/)
  })
})

describe('formatDateTime', () => {
  it('returns an em dash for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })
  it('includes a time component', () => {
    const out = formatDateTime('2026-05-15T13:30:00Z')
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/:\d{2}/)
  })
})

describe('initials', () => {
  it('returns ? for empty input', () => {
    expect(initials(null)).toBe('?')
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
  })
  it('takes first two word initials, uppercased', () => {
    expect(initials('ada lovelace')).toBe('AL')
    expect(initials('Grace Brewster Hopper')).toBe('GB')
  })
  it('handles a single name', () => {
    expect(initials('Cher')).toBe('C')
  })
})
