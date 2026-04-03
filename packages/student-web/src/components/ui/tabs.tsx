/**
 * 文件说明：基于 shadcn/ui 约定封装的 Tabs 原语。
 * 统一承接登录/注册等需要主题化分段切换的交互。
 */
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

/**
 * 渲染 Tabs 根节点。
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-5', className)}
      {...props}
    />
  );
}

/**
 * 渲染 TabsList。
 */
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex w-fit items-center gap-6 border-b border-border/80 bg-transparent p-0 text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

/**
 * 渲染 TabsTrigger。
 */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex items-center justify-center px-0 pb-3 text-[15px] font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground data-[state=active]:text-foreground disabled:pointer-events-none disabled:opacity-50 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-center after:scale-x-0 after:bg-primary after:transition-transform after:content-[""] data-[state=active]:after:scale-x-100',
        className
      )}
      {...props}
    />
  );
}

/**
 * 渲染 TabsContent。
 */
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
