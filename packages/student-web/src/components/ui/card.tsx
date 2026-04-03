/**
 * 文件说明：基于 shadcn/ui 约定封装的卡片原语。
 * 统一承接内容面板、玻璃面板与占位页信息卡片的基础外观。
 */
import * as React from 'react';

import { cn } from '@/lib/utils';

type CardProps = React.ComponentProps<'div'>;

/**
 * 渲染卡片容器。
 *
 * @param props - 卡片参数。
 * @returns 卡片节点。
 */
function Card({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-[var(--xm-radius-xl)] border border-[color:var(--xm-color-border-strong)] bg-card text-card-foreground shadow-[var(--xm-shadow-card)]',
        className
      )}
      {...props}
    />
  );
}

/**
 * 渲染卡片头部。
 *
 * @param props - 头部参数。
 * @returns 头部节点。
 */
function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-2 px-6 pt-6', className)}
      {...props}
    />
  );
}

/**
 * 渲染卡片标题。
 *
 * @param props - 标题参数。
 * @returns 标题节点。
 */
function CardTitle({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-lg font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

/**
 * 渲染卡片描述。
 *
 * @param props - 描述参数。
 * @returns 描述节点。
 */
function CardDescription({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm leading-6 text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * 渲染卡片正文。
 *
 * @param props - 正文参数。
 * @returns 正文节点。
 */
function CardContent({ className, ...props }: CardProps) {
  return (
    <div data-slot="card-content" className={cn('px-6 pb-6', className)} {...props} />
  );
}

/**
 * 渲染卡片底部。
 *
 * @param props - 底部参数。
 * @returns 底部节点。
 */
function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-3 px-6 pb-6', className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
