import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const StubIcon = (props: React.SVGProps<SVGSVGElement>) =>
  React.createElement('svg', { 'data-icon': true, ...props })

vi.mock('lucide-react', () => ({
  Check: StubIcon,
  Link2: StubIcon,
}))

const { ShareEventButton } = await import('./ShareEventButton')

describe('ShareEventButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders a Copy link button in the resting state', () => {
    const html = renderToStaticMarkup(<ShareEventButton eventId="abc-123" />)
    expect(html).toContain('Copy link')
    expect(html).toContain('<button')
    // The check icon should not be present at rest, only the Link2 icon.
    // Both stub to <svg data-icon>; ensure exactly one svg is rendered.
    expect((html.match(/data-icon/g) ?? []).length).toBe(1)
  })

  it('SSR renders even when window/clipboard are unavailable', () => {
    // Render path must not throw during SSR — the `typeof window` guard handles this.
    expect(() => renderToStaticMarkup(<ShareEventButton eventId="xyz" />)).not.toThrow()
  })
})
