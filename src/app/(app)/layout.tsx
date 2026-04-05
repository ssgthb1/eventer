import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (profileError) console.error('[AppLayout] profile fetch failed:', profileError.message)

  return (
    <AppShell profile={profile ?? { full_name: null, avatar_url: null, role: 'user' }}>
      {children}
    </AppShell>
  )
}
