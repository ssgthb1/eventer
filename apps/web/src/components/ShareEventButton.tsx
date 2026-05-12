'use client'

import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface ShareEventButtonProps {
  eventId: string
}

export function ShareEventButton({ eventId }: ShareEventButtonProps) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCopy() {
    if (typeof window === 'undefined') return

    const url = `${window.location.origin}/events/${eventId}`

    // Clipboard API requires a secure context. Fall back to a hidden textarea
    // for HTTP / older browsers so the button stays useful.
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setError(null)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy. Long-press the address bar instead.')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        leftIcon={copied ? <Check /> : <Link2 />}
        onClick={handleCopy}
      >
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
