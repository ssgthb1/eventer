import * as React from 'react'
import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500',
        secondary:
          'bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 focus-visible:ring-slate-400',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-slate-400',
        danger:
          'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
        dangerOutline:
          'border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 active:bg-red-100 focus-visible:ring-red-400',
        dangerGhost:
          'text-red-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100 focus-visible:ring-red-400',
        success:
          'bg-green-600 text-white shadow-sm hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs gap-1.5',
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonStyles>

type SharedOwnProps = ButtonVariantProps & {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
  loadingText?: string
  className?: string
  children: React.ReactNode
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

function renderContent({
  loading,
  loadingText,
  leftIcon,
  rightIcon,
  children,
  size,
}: Pick<SharedOwnProps, 'loading' | 'loadingText' | 'leftIcon' | 'rightIcon' | 'children'> & {
  size: ButtonVariantProps['size']
}) {
  const iconSize = size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <>
      {loading ? (
        <Spinner className={iconSize} />
      ) : leftIcon ? (
        <span className={cn('inline-flex shrink-0', iconSize)}>{leftIcon}</span>
      ) : null}
      <span className="inline-flex items-center truncate">
        {loading && loadingText ? loadingText : children}
      </span>
      {!loading && rightIcon ? (
        <span className={cn('inline-flex shrink-0', iconSize)}>{rightIcon}</span>
      ) : null}
    </>
  )
}

export type ButtonProps = SharedOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, leftIcon, rightIcon, loading, loadingText, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {renderContent({ loading, loadingText, leftIcon, rightIcon, children, size })}
    </button>
  )
})

export type LinkButtonProps = SharedOwnProps &
  Omit<React.ComponentProps<typeof Link>, 'className' | 'children'>

export function LinkButton({
  variant,
  size,
  fullWidth,
  leftIcon,
  rightIcon,
  loading,
  loadingText,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      aria-busy={loading || undefined}
      {...rest}
    >
      {renderContent({ loading, loadingText, leftIcon, rightIcon, children, size })}
    </Link>
  )
}

export const iconButtonStyles = cva(
  'inline-flex items-center justify-center rounded-lg transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
        secondary: 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 focus-visible:ring-slate-400',
        ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
        danger: 'text-red-400 hover:bg-red-50 hover:text-red-600 focus-visible:ring-red-400',
      },
      size: {
        xs: 'h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5',
        sm: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
        md: 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'sm',
    },
  },
)

export type IconButtonProps = VariantProps<typeof iconButtonStyles> &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    'aria-label': string
    className?: string
  }

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant, size, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonStyles({ variant, size }), className)}
      {...rest}
    >
      {children}
    </button>
  )
})
