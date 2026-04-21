/**
 * 文件说明：全局顶栏导航桌面端部分（md 及以上）。
 * 负责品牌入口、桌面导航链接、工作区路由、主题切换、语言切换与账号动作。
 */
import { Languages, Menu, Moon, SunMedium, X } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import { useTopNavControls } from '@/components/navigation/use-top-nav-controls';
import { UserAvatarMenu } from '@/components/navigation/user-avatar-menu';
import { cn } from '@/lib/utils';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import {
  type GlobalTopNavLink,
  type GlobalTopNavProps,
  type WorkspaceRoute,
  isActiveLink,
  resolveNavClassNames,
  WORKSPACE_ICON_MAP
} from './global-top-nav-shared';

/**
 * 渲染桌面端顶栏导航。
 */
export function GlobalTopNavDesktop({
  links,
  variant = 'surface',
  workspaceRoutes,
  workspaceUtilitySlot,
  showBrandIcon = false,
  showAuthAction = false,
  showLocaleToggle = false,
  className
}: GlobalTopNavProps) {
  const { t } = useAppTranslation();
  const location = useLocation();
  const session = useAuthSessionStore(state => state.session);
  const {
    closeMobileMenu,
    handleLocaleToggle,
    localeToggleLabel,
    mobileMenuOpen,
    openMenuLabel,
    themeMode,
    themeToggleAriaLabel,
    toggleThemeMode
  } = useTopNavControls();

  const brandLabel = useMemo(
    () =>
      variant === 'home'
        ? t('entryNav.homeBrand')
        : t('entryNav.brand'),
    [t, variant]
  );

  const isWorkspace = variant === 'workspace';
  const { navBaseClassName, linkClassName, actionButtonVariant } = resolveNavClassNames(variant);

  const accountAction = {
    label: session?.accessToken
      ? t('entryNav.openWorkspace')
      : t('entryNav.signIn'),
    to: '/classroom/input'
  };

  function renderNavLink(link: GlobalTopNavLink) {
    const isCurrent = isActiveLink(location.pathname, link.href);
    const sharedClassName = cn(
      linkClassName,
      isCurrent ? 'text-primary' : null
    );

    if (link.href.startsWith('#')) {
      return (
        <a
          key={`${link.href}-desktop`}
          href={link.href}
          className={sharedClassName}
          onClick={closeMobileMenu}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={`${link.href}-desktop`}
        to={link.href}
        className={sharedClassName}
        onClick={closeMobileMenu}
      >
        {link.label}
      </Link>
    );
  }

  function renderWorkspaceRoutes(routes: WorkspaceRoute[]) {
    return routes.map(route => {
      const isCurrent = isActiveLink(location.pathname, route.href);
      const IconComp = WORKSPACE_ICON_MAP[route.icon];
      return (
        <Link
          key={route.href}
          to={route.href}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
            isCurrent
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {IconComp ? <IconComp className="h-3.5 w-3.5" /> : null}
          <span>{route.label}</span>
        </Link>
      );
    });
  }

  return (
    <nav
      className={cn(
        'pointer-events-auto mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 rounded-full px-5 py-4 md:px-8',
        variant === 'home'
          ? 'bg-transparent'
          : 'sticky top-5 z-40 mt-5',
        navBaseClassName,
        className
      )}
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          'flex items-center gap-3 font-bold transition hover:opacity-90 cursor-pointer',
          variant === 'home' ? 'text-[24px]' : 'text-lg'
        )}
      >
        {showBrandIcon ? (
          <span className="xm-global-top-nav__brand-icon" aria-hidden="true">
            <img
              src="/entry/logo.png"
              alt=""
              className="xm-global-top-nav__brand-logo"
            />
          </span>
        ) : null}
        <span>{brandLabel}</span>
      </button>

      {isWorkspace && workspaceRoutes ? (
        <div className="hidden items-center gap-1 rounded-full border border-border/60 bg-background/50 px-1.5 py-1 md:flex">
          {renderWorkspaceRoutes(workspaceRoutes)}
        </div>
      ) : (
        <div className="hidden items-center gap-8 md:flex">
          {links.map(link => renderNavLink(link))}
        </div>
      )}

      <div className="flex items-center gap-2 md:gap-3">
        {workspaceUtilitySlot}

        {showLocaleToggle ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-10 border-border/80 bg-background/70 px-3"
            aria-label={localeToggleLabel}
            onClick={handleLocaleToggle}
          >
            <Languages className="mr-1 h-4 w-4" />
            <span>{localeToggleLabel}</span>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-border/80 bg-background/70"
          aria-label={themeToggleAriaLabel}
          onClick={toggleThemeMode}
        >
          {themeMode === 'dark' ? (
            <SunMedium className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {showAuthAction ? (
          session?.accessToken ? (
            // 登录态统一显示头像下拉菜单（内含 学习中心 / 个人资料 / 设置 / 退出登录），
            // 替代历史上的 "登出按钮 + 首字母圆圈" 双块布局。
            <UserAvatarMenu className="hidden md:inline-flex" />
          ) : (
            <Button
              asChild
              variant={actionButtonVariant}
              className="hidden md:inline-flex"
            >
              <Link to={accountAction.to}>{accountAction.label}</Link>
            </Button>
          )
        ) : null}

        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-border/80 bg-background/70 md:hidden"
            aria-label={mobileMenuOpen ? t('entryNav.closeMenu') : openMenuLabel}
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </DialogTrigger>
      </div>
    </nav>
  );
}
