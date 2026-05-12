import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-full font-medium capitalize whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-slate-100 text-slate-600',
        brand: 'bg-indigo-100 text-indigo-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
      },
      withDot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'sm',
      withDot: false,
    },
  },
)

const dotColors: Record<NonNullable<VariantProps<typeof badgeStyles>['variant']>, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-indigo-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
}

export type BadgeProps = VariantProps<typeof badgeStyles> &
  Omit<React.HTMLAttributes<HTMLSpanElement>, 'className'> & {
    className?: string
    children: React.ReactNode
  }

export function Badge({ variant, size, withDot, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(badgeStyles({ variant, size, withDot }), className)} {...rest}>
      {withDot ? (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant ?? 'neutral'])}
        />
      ) : null}
      {children}
    </span>
  )
}
