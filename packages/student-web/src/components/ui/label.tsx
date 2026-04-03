/**
 * 文件说明：基于 shadcn/ui 约定封装的标签原语。
 * 统一承接表单与开关类控件的可访问标签语义。
 */
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/utils';

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

/**
 * 渲染统一标签原语。
 *
 * @param props - 标签参数。
 * @returns 标签节点。
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      data-slot="label"
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
});

export { Label };
