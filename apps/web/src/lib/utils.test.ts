import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, formatDateTime, initials } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('deduplicates tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})

describe('formatCurrency', () => {
  it('formats USD amounts', () => {
    expect(formatCurrency(10)).toBe('$10.00')
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })
})

describe('formatDate', () => {
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('formats a date string', () => {
    const result = formatDate('2025-12-25T00:00:00Z')
    expect(result).toContain('2025')
    expect(result).toContain('Dec')
  })
})

describe('formatDateTime', () => {
  it('returns em dash for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('formats a datetime string with time', () => {
    const result = formatDateTime('2025-12-25T15:30:00Z')
    expect(result).toContain('2025')
    expect(result).toContain('Dec')
  })
})

describe('initials', () => {
  it('returns ? for null', () => {
    expect(initials(null)).toBe('?')
  })

  it('extracts initials', () => {
    expect(initials('Jane Doe')).toBe('JD')
    expect(initials('Alice')).toBe('A')
  })

  it('handles whitespace-only name without crashing', () => {
    expect(initials('  ')).toBe('')
  })
})
