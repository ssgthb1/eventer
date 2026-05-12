import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) =>
    React.createElement('a', { href, ...rest }, children),
}))

// Lucide icons internally call useContext for default-prop merging, which fails under
// react-dom/server's static renderer in a Node test env. Render a simple svg stand-in.
const StubIcon = (props: React.SVGProps<SVGSVGElement>) =>
  React.createElement('svg', { 'data-icon': true, ...props })

vi.mock('lucide-react', () => ({
  ArrowLeft: StubIcon,
  ArrowRight: StubIcon,
  Pencil: StubIcon,
  Trash2: StubIcon,
  Plus: StubIcon,
  Calendar: StubIcon,
  Users: StubIcon,
  DollarSign: StubIcon,
  CheckSquare: StubIcon,
  UserPlus: StubIcon,
  UserMinus: StubIcon,
  X: StubIcon,
  Send: StubIcon,
  Check: StubIcon,
}))

const { Badge, badgeStyles } = await import('./Badge')
const { EmptyState } = await import('./EmptyState')
const { BackButton } = await import('./BackButton')
const { iconButtonStyles } = await import('./Button')

describe('Badge', () => {
  it('renders children with neutral variant by default', () => {
    const html = renderToStaticMarkup(<Badge>draft</Badge>)
    expect(html).toContain('draft')
    expect(html).toContain('bg-slate-100')
    expect(html).not.toContain('rounded-full bg-')
  })

  it('renders the status dot when withDot is set', () => {
    const html = renderToStaticMarkup(
      <Badge variant="success" withDot>
        active
      </Badge>,
    )
    expect(html).toContain('bg-green-500')
    expect(html).toContain('h-1.5 w-1.5')
  })

  it('produces the right tone classes per variant', () => {
    expect(badgeStyles({ variant: 'brand' })).toContain('bg-indigo-100')
    expect(badgeStyles({ variant: 'success' })).toContain('bg-green-100')
    expect(badgeStyles({ variant: 'warning' })).toContain('bg-amber-100')
    expect(badgeStyles({ variant: 'danger' })).toContain('bg-red-100')
    expect(badgeStyles({ variant: 'info' })).toContain('bg-blue-100')
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No events yet" description="Make your first event." />,
    )
    expect(html).toContain('No events yet')
    expect(html).toContain('Make your first event.')
  })

  it('renders the action slot when provided', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Empty" action={<button data-testid="cta">Go</button>} />,
    )
    expect(html).toContain('data-testid="cta"')
    expect(html).toContain('>Go<')
  })

  it('skips icon and description when not provided', () => {
    const html = renderToStaticMarkup(<EmptyState title="Empty" />)
    expect(html).toContain('Empty')
    expect(html).not.toContain('rounded-full bg-slate-100')
  })
})

describe('BackButton', () => {
  it('renders as an anchor with arrow icon and Back label by default', () => {
    const html = renderToStaticMarkup(<BackButton href="/events" />)
    expect(html).toContain('href="/events"')
    expect(html).toContain('Back')
    expect(html).toContain('<svg')
  })

  it('respects a custom label', () => {
    const html = renderToStaticMarkup(<BackButton href="/x" label="Summer BBQ" />)
    expect(html).toContain('Summer BBQ')
  })
})

describe('IconButton styles', () => {
  it('uses a warm danger resting colour and red hover surface', () => {
    const classes = iconButtonStyles({ variant: 'danger' })
    expect(classes).toContain('hover:bg-red-50')
    expect(classes).toContain('hover:text-red-600')
  })
})
