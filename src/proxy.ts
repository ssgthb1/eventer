import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must be called before any conditional logic
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public paths — no auth required
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/invite/')

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from login page
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based guards — fetch profile role for protected routes
  if (user && (pathname.startsWith('/admin') || pathname.startsWith('/super-admin'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'user'

    if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
