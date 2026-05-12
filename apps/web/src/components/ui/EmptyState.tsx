import * as React from 'react'
import { cn } from '@/lib/utils'

export type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl px-6 py-12 flex flex-col items-center text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
