import * as React from 'react'
import { cn } from '@/lib/utils'

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: 'div' | 'section' | 'article'
  padded?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { as: Component = 'div', padded = true, className, ...rest },
  ref,
) {
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn(
        'bg-white border border-slate-200 rounded-xl shadow-sm',
        padded && 'p-5',
        className,
      )}
      {...rest}
    />
  )
})
