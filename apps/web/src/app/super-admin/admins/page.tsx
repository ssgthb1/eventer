'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { RoleBadge } from '@/components/RoleBadge'
import type { Profile } from '@/types'

export default function SuperAdminAdminsPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load users')
        return
      }
      setUsers(json.users ?? [])
    } catch {
      setError('Network error — could not load users')
    } finally {
      setLoading(false)
    }
  }

  async function changeRole(userId: string, newRole: Profile['role']) {
    setUpdating(userId)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to update role')
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      }
    } catch {
      setError('Network error — could not update role')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Super Admin — Manage Roles</h1>
          <p className="text-slate-500 text-sm mt-1">Promote or demote users to admin</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 font-medium text-slate-600">User</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Current Role</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!users.length ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400">No users found</td>
                </tr>
              ) : users.map((u) => (
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
                  <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-6 py-4">
                    {u.role === 'super_admin' ? (
                      <span className="text-slate-400 text-xs italic">Cannot change</span>
                    ) : (
                      <div className="flex gap-2">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => changeRole(u.id, 'admin')}
                            disabled={updating === u.id}
                            className="px-3 py-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Promote to admin
                          </button>
                        )}
                        {u.role === 'admin' && (
                          <button
                            onClick={() => changeRole(u.id, 'user')}
                            disabled={updating === u.id}
                            className="px-3 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Demote to user
                          </button>
                        )}
                      </div>
                    )}
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
