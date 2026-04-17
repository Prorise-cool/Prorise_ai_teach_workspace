/**
 * 文件说明：全局顶栏导航共享类型与工具函数。
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, LayoutTemplate, Video } from 'lucide-react';

import { cn } from '@/lib/utils';

export type GlobalTopNavLink = {
  href: string;
  label: string;
};

export type WorkspaceRoute = {
  href: string;
  label: string;
  icon: string;
};

export type GlobalTopNavProps = {
  links: GlobalTopNavLink[];
  variant?: 'home' | 'surface' | 'workspace';
  workspaceRoutes?: WorkspaceRoute[];
  workspaceUtilitySlot?: ReactNode;
  showBrandIcon?: boolean;
  showAuthAction?: boolean;
  showLocaleToggle?: boolean;
  className?: string;
};

/** 图标名到组件的映射。 */
export const WORKSPACE_ICON_MAP: Record<string, LucideIcon> = {
  video: Video,
  'layout-template': LayoutTemplate,
  'book-open': BookOpen
};

/**
 * 解析导航链接是否指向当前激活位置。
 */
export function isActiveLink(currentPathname: string, href: string) {
  if (href.startsWith('#')) {
    return false;
  }

  const targetPathname = href.split('#')[0] ?? href;

  if (!targetPathname) {
    return false;
  }

  return currentPathname === targetPathname;
}

export function resolveNavClassNames(variant: 'home' | 'surface' | 'workspace') {
  const navBaseClassName =
    variant === 'home'
      ? 'text-[color:var(--xm-color-text-primary)]'
      : 'border border-[color:var(--xm-color-border-strong)] bg-[color:var(--xm-color-surface-glass)] text-foreground shadow-[var(--xm-shadow-nav)] backdrop-blur-[var(--xm-blur-surface)]';

  const linkClassName =
    variant === 'home'
      ? 'text-[14px] font-medium text-[color:var(--xm-color-text-primary)] transition hover:text-primary'
      : 'text-sm font-medium text-foreground transition hover:text-primary';

  const actionButtonVariant: 'home' | 'default' =
    variant === 'home' ? 'home' : 'default';

  return { navBaseClassName, linkClassName, actionButtonVariant };
}
