import type { Role } from '@/types'

const styles: Record<Role, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-indigo-100 text-indigo-700',
  user: 'bg-slate-100 text-slate-600',
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[role]}`}>
      {role.replaceAll('_', ' ')}
    </span>
  )
}
