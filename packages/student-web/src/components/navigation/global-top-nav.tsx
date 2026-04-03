/**
 * 文件说明：提供首页、落地页与后续页面共用的全局顶栏导航。
 * 负责品牌入口、跨页导航、主题切换、语言切换与基础账号动作。
 */
import { Languages, LogOut, Menu, Moon, SunMedium, X } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { appI18n } from '@/app/i18n';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import '@/components/navigation/global-top-nav.scss';

type GlobalTopNavLink = {
  href: string;
  label: string;
};

type GlobalTopNavProps = {
  links: GlobalTopNavLink[];
  variant?: 'home' | 'surface';
  showBrandIcon?: boolean;
  showAuthAction?: boolean;
  showLocaleToggle?: boolean;
  className?: string;
};

/**
 * 解析导航链接是否指向当前激活位置。
 *
 * @param currentPathname - 当前路由路径。
 * @param href - 导航目标地址。
 * @returns 是否为当前激活链接。
 */
function isActiveLink(currentPathname: string, href: string) {
  if (href.startsWith('#')) {
    return false;
  }

  const targetPathname = href.split('#')[0] ?? href;

  if (!targetPathname) {
    return false;
  }

  return currentPathname === targetPathname;
}

/**
 * 渲染一个响应式全局顶栏导航。
 *
 * @param props - 组件参数。
 * @returns 顶栏导航节点。
 */
export function GlobalTopNav({
  links,
  variant = 'surface',
  showBrandIcon = false,
  showAuthAction = false,
  showLocaleToggle = false,
  className
}: GlobalTopNavProps) {
  const { t } = useAppTranslation();
  const location = useLocation();
  const session = useAuthSessionStore(state => state.session);
  const { logout, isLoggingOut } = useAuthSessionActions();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brandLabel = useMemo(
    () =>
      variant === 'home'
        ? t('entryNav.homeBrand')
        : t('entryNav.brand'),
    [t, variant]
  );

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

  const accountAction = {
    label: session?.accessToken
      ? t('entryNav.openWorkspace')
      : t('entryNav.signIn'),
    to: '/classroom/input'
  };

  const nextLocale = appI18n.resolvedLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function handleLocaleToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void appI18n.changeLanguage(nextLocale);
  }

  function renderNavLink(link: GlobalTopNavLink, mobile = false) {
    const isCurrent = isActiveLink(location.pathname, link.href);
    const sharedClassName = cn(
      linkClassName,
      isCurrent ? 'text-primary' : null,
      mobile ? 'rounded-full px-4 py-3 text-left' : null
    );

    if (link.href.startsWith('#')) {
      return (
        <a
          key={`${link.href}-${mobile ? 'mobile' : 'desktop'}`}
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
        key={`${link.href}-${mobile ? 'mobile' : 'desktop'}`}
        to={link.href}
        className={sharedClassName}
        onClick={closeMobileMenu}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
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
        <Link
          to="/"
          className={cn(
            'flex items-center gap-3 font-bold transition hover:opacity-90',
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
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map(link => renderNavLink(link))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {showLocaleToggle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-10 border-border/80 bg-background/70 px-3"
              aria-label={t('entryNav.localeToggle')}
              onClick={handleLocaleToggle}
            >
              <Languages className="mr-1 h-4 w-4" />
              <span>{t('entryNav.localeToggle')}</span>
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-border/80 bg-background/70"
            aria-label={t('entryNav.themeToggle')}
            onClick={toggleThemeMode}
          >
            {themeMode === 'dark' ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {showAuthAction ? (
            <>
              <Button
                asChild
                variant={actionButtonVariant}
                className="hidden md:inline-flex"
              >
                <Link to={accountAction.to}>{accountAction.label}</Link>
              </Button>

              {session?.accessToken ? (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden border-border/80 md:inline-flex"
                  disabled={isLoggingOut}
                  onClick={() => {
                    void logout();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('entryNav.signOut')}
                </Button>
              ) : null}
            </>
          ) : null}

          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-border/80 bg-background/70 md:hidden"
              aria-label={mobileMenuOpen ? t('common.close') : t('common.openMenu')}
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

      <DialogContent
        aria-describedby={undefined}
        className="right-4 top-4 w-[min(88vw,360px)] rounded-[var(--xm-radius-xl)] border border-border/70 bg-[color:var(--xm-color-surface-glass)] p-5 shadow-[var(--xm-shadow-dialog)] backdrop-blur-[var(--xm-blur-surface)] md:hidden"
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogTitle className="font-semibold">{brandLabel}</DialogTitle>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 border-border/80 bg-background/70"
            aria-label={t('common.close')}
            onClick={closeMobileMenu}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {links.map(link => renderNavLink(link, true))}

          {showAuthAction ? (
            <Button
              asChild
              variant={actionButtonVariant}
              className="mt-2"
            >
              <Link to={accountAction.to} onClick={closeMobileMenu}>
                {accountAction.label}
              </Link>
            </Button>
          ) : null}

          {session?.accessToken ? (
            <Button
              type="button"
              variant="outline"
              className="border-border/80"
              disabled={isLoggingOut}
              onClick={() => {
                closeMobileMenu();
                void logout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('entryNav.signOut')}
            </Button>
          ) : null}

          {showLocaleToggle ? (
            <Button
              type="button"
              variant="outline"
              className="border-border/80"
              onClick={event => {
                closeMobileMenu();
                handleLocaleToggle(event);
              }}
            >
              <Languages className="mr-2 h-4 w-4" />
              {t('entryNav.localeToggle')}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
