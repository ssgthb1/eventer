import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Validate that a `next` redirect target is a safe internal path. */
function safeNext(next: string | null): string {
  if (!next) return '/dashboard'
  // Must be a relative path starting with / and not a protocol-relative URL (//)
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
