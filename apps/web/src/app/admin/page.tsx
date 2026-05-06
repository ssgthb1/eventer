import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { RoleBadge } from '@/components/RoleBadge'
import type { Profile } from '@/types'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, phone, role, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin — All Users</h1>
          <p className="text-slate-500 text-sm mt-1">{users?.length ?? 0} users (showing up to 100)</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 font-medium text-slate-600">User</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Phone</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!users?.length ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No users found</td>
                </tr>
              ) : users.map((u: Profile) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <Image
                          src={u.avatar_url}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-xs">
                          {(u.full_name ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-slate-900">{u.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{u.phone ?? '—'}</td>
                  <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
