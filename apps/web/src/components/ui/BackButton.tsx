import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import { LinkButton, type LinkButtonProps } from './Button'

export type BackButtonProps = Omit<LinkButtonProps, 'variant' | 'leftIcon' | 'children'> & {
  label?: React.ReactNode
  variant?: LinkButtonProps['variant']
}

export function BackButton({ label = 'Back', variant = 'ghost', size = 'sm', ...rest }: BackButtonProps) {
  return (
    <LinkButton variant={variant} size={size} leftIcon={<ArrowLeft />} {...rest}>
      {label}
    </LinkButton>
  )
}
