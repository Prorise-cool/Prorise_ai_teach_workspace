/**
 * Label 基础组件。
 * 对齐表单标签样式，保证表单结构在当前联调壳层中保持一致。
 */
import * as LabelPrimitive from '@radix-ui/react-label'
import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'

export function Label({ className, ...props }: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}
