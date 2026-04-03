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
import { cn } from '@/lib/utils';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import { useAuthSessionStore } from '@/stores/auth-session-store';

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

  const actionButtonClassName =
    variant === 'home'
      ? 'rounded-full bg-[color:var(--xm-color-surface-glass)] text-[color:var(--xm-color-text-primary)] shadow-sm hover:bg-[color:var(--xm-color-surface)]'
      : 'rounded-full bg-primary text-primary-foreground shadow-sm hover:brightness-105';

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
    <>
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
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-background/80">
              <img
                src="/entry/logo.png"
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain"
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
            <button
              type="button"
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-border/80 bg-background/70 px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              aria-label={t('entryNav.localeToggle')}
              onClick={handleLocaleToggle}
            >
              <Languages className="mr-1 h-4 w-4" />
              <span>{t('entryNav.localeToggle')}</span>
            </button>
          ) : null}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/70 text-foreground shadow-sm transition hover:bg-muted"
            aria-label={t('entryNav.themeToggle')}
            onClick={toggleThemeMode}
          >
            {themeMode === 'dark' ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {showAuthAction ? (
            <>
              <Link
                to={accountAction.to}
                className={cn(
                  'hidden h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition md:inline-flex',
                  actionButtonClassName
                )}
              >
                {accountAction.label}
              </Link>

              {session?.accessToken ? (
                <button
                  type="button"
                  className="hidden h-10 items-center justify-center rounded-full border border-border/80 px-4 text-sm font-medium text-foreground transition hover:bg-muted md:inline-flex"
                  disabled={isLoggingOut}
                  onClick={() => {
                    void logout();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('entryNav.signOut')}
                </button>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/70 text-foreground shadow-sm transition hover:bg-muted md:hidden"
            aria-label={mobileMenuOpen ? t('common.close') : t('common.openMenu')}
            onClick={() => {
              setMobileMenuOpen(currentOpen => !currentOpen);
            }}
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </nav>

      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/36 backdrop-blur-sm transition md:hidden',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div
          className={cn(
            'absolute right-4 top-4 w-[min(88vw,360px)] rounded-[var(--xm-radius-xl)] border border-border/70 bg-[color:var(--xm-color-surface-glass)] p-5 shadow-[var(--xm-shadow-dialog)] backdrop-blur-[var(--xm-blur-surface)] transition',
            mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="font-semibold text-foreground">{brandLabel}</span>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/70"
              aria-label={t('common.close')}
              onClick={closeMobileMenu}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {links.map(link => renderNavLink(link, true))}

            {showAuthAction ? (
              <Link
                to={accountAction.to}
                className={cn(
                  'mt-2 inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold',
                  actionButtonClassName
                )}
                onClick={closeMobileMenu}
              >
                {accountAction.label}
              </Link>
            ) : null}

            {session?.accessToken ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-border/80 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
                disabled={isLoggingOut}
                onClick={() => {
                  closeMobileMenu();
                  void logout();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('entryNav.signOut')}
              </button>
            ) : null}

            {showLocaleToggle ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-border/80 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
                onClick={event => {
                  closeMobileMenu();
                  handleLocaleToggle(event);
                }}
              >
                <Languages className="mr-2 h-4 w-4" />
                {t('entryNav.localeToggle')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
