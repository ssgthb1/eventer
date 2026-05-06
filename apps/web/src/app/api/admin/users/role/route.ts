import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

const ALLOWED_ROLES: Role[] = ['user', 'admin']

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { userId?: string; role?: Role }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { userId, role } = body

  if (!userId || !role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 })
  }

  // Atomic update: skip if target is already a super_admin (prevents TOCTOU race)
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .neq('role', 'super_admin')
    .select('id')
    .single()

  if (error) {
    console.error('[PATCH /api/admin/users/role]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Cannot change a super_admin role' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
