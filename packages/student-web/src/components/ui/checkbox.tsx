/**
 * 文件说明：基于 shadcn/ui 约定封装的复选框原语。
 * 统一承接认证页协议勾选等布尔输入场景。
 */
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

/**
 * 渲染统一复选框原语。
 *
 * @param props - 复选框参数。
 * @returns 复选框节点。
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      className={cn(
        'peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-primary shadow-sm outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-[color:var(--xm-color-ring)] focus-visible:ring-2 focus-visible:ring-[color:var(--xm-color-ring)]/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center"
      >
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

export { Checkbox };
