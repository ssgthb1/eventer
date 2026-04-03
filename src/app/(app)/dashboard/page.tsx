import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt="avatar"
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome, {profile?.full_name ?? user.email} 👋
            </h1>
            <p className="text-slate-500 text-sm capitalize">Role: {profile?.role}</p>
          </div>
        </div>
        <p className="text-slate-400">Dashboard coming soon — auth is working!</p>
      </div>
    </div>
  )
}
