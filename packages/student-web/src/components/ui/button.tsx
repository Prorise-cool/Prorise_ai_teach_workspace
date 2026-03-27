/**
 * Button 基础组件。
 * 统一封装 student-web 当前阶段使用的按钮尺寸与视觉变体。
 */
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-12 px-5',
        icon: 'h-11 w-11',
        lg: 'h-14 px-6 text-base',
        sm: 'h-10 px-4',
      },
      variant: {
        default: 'bg-primary text-primary-foreground shadow-[0_18px_38px_-24px_rgba(29,78,216,0.72)] hover:opacity-95',
        ghost: 'bg-transparent text-foreground hover:bg-foreground/5',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/85',
        soft: 'bg-white/75 text-foreground ring-1 ring-black/5 hover:bg-white',
      },
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  asChild = false,
  className,
  size,
  type = 'button',
  variant,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      type={type}
      {...props}
    />
  )
}
