'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { RoleBadge } from './RoleBadge'
import type { Profile } from '@/types'

interface TopNavProps {
  profile: Pick<Profile, 'full_name' | 'avatar_url' | 'role'>
  onMenuClick: () => void
}

export function TopNav({ profile, onMenuClick }: TopNavProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[TopNav] signOut failed:', err)
    }
    // Refresh server cache before navigating so the layout re-checks auth
    router.refresh()
    router.push('/login')
  }

  const initials = (profile.full_name?.trim() || '?')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const displayName = profile.full_name || 'User'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-900 p-1 rounded"
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Spacer on desktop */}
      <div className="hidden lg:block" />

      {/* User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          aria-label={`Account menu for ${displayName}`}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          className="flex items-center gap-3 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
        >
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-xs">
              {initials}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-900 leading-none">{displayName}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{profile.role.replaceAll('_', ' ')}</p>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50"
          >
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900">{displayName}</p>
              <div className="mt-1">
                <RoleBadge role={profile.role} />
              </div>
            </div>
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
