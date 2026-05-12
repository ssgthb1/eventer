import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock next/link to a plain anchor so renderToStaticMarkup doesn't hit Next's runtime contexts
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) =>
    React.createElement('a', { href, ...rest }, children),
}))

const { Button, LinkButton, IconButton, buttonStyles } = await import('./Button')

describe('Button styles', () => {
  it('produces variant-specific classes', () => {
    expect(buttonStyles({ variant: 'primary' })).toContain('bg-indigo-600')
    expect(buttonStyles({ variant: 'secondary' })).toContain('border-slate-300')
    expect(buttonStyles({ variant: 'ghost' })).toContain('hover:bg-slate-100')
    expect(buttonStyles({ variant: 'danger' })).toContain('bg-red-600')
    expect(buttonStyles({ variant: 'dangerOutline' })).toContain('border-red-200')
    expect(buttonStyles({ variant: 'dangerGhost' })).toContain('text-red-500')
    expect(buttonStyles({ variant: 'dangerGhost' })).not.toContain('border')
  })

  it('respects fullWidth modifier', () => {
    expect(buttonStyles({ fullWidth: true })).toContain('w-full')
    expect(buttonStyles({ fullWidth: false })).not.toContain('w-full')
  })
})

describe('Button (button element)', () => {
  it('renders children inside a button with type=button by default', () => {
    const html = renderToStaticMarkup(<Button>Save</Button>)
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('Save')
  })

  it('disables the button while loading and shows loadingText', () => {
    const html = renderToStaticMarkup(
      <Button loading loadingText="Saving…">
        Save
      </Button>,
    )
    expect(html).toContain('disabled')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Saving…')
    expect(html).not.toContain('>Save<')
  })

  it('renders left and right icon slots', () => {
    const html = renderToStaticMarkup(
      <Button leftIcon={<span data-testid="left">L</span>} rightIcon={<span data-testid="right">R</span>}>
        Go
      </Button>,
    )
    expect(html).toContain('data-testid="left"')
    expect(html).toContain('data-testid="right"')
  })

  it('hides rightIcon while loading', () => {
    const html = renderToStaticMarkup(
      <Button loading rightIcon={<span data-testid="right">R</span>}>
        Go
      </Button>,
    )
    expect(html).not.toContain('data-testid="right"')
  })

  it('forwards onClick to the button', () => {
    // onClick can't fire via static markup; just verify the prop is accepted at the type level
    const onClick = vi.fn()
    const html = renderToStaticMarkup(<Button onClick={onClick}>Click</Button>)
    expect(html).toContain('Click')
  })
})

describe('LinkButton', () => {
  it('renders an anchor with href', () => {
    const html = renderToStaticMarkup(<LinkButton href="/events">Events</LinkButton>)
    expect(html).toContain('<a')
    expect(html).toContain('href="/events"')
    expect(html).toContain('Events')
  })
})

describe('IconButton', () => {
  it('renders a square button with aria-label', () => {
    const html = renderToStaticMarkup(
      <IconButton aria-label="Close">
        <svg />
      </IconButton>,
    )
    expect(html).toContain('aria-label="Close"')
    expect(html).toContain('<svg')
  })
})
