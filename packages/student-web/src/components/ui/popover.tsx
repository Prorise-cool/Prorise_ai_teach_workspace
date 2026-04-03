/**
 * 文件说明：基于 shadcn/ui 约定封装的 Popover 原语。
 * 统一承接导航浮层、说明悬浮层等轻量信息容器。
 */
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

/**
 * 渲染 Popover 内容层。
 *
 * @param props - 内容参数。
 * @returns Popover 内容节点。
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentProps<typeof PopoverPrimitive.Content>
>(function PopoverContent(
  { className, align = 'center', sideOffset = 8, ...props },
  ref
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger
};
