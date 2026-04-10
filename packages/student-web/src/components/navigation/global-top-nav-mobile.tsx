/**
 * 文件说明：全局顶栏导航移动端弹出菜单。
 * 负责移动端弹出菜单中的导航链接列表、账号动作与语言切换。
 */
import { Languages, LogOut, X } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useTopNavControls } from '@/components/navigation/use-top-nav-controls';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { cn } from '@/lib/utils';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import {
  type GlobalTopNavLink,
  type GlobalTopNavProps,
  isActiveLink,
  resolveNavClassNames,
  WORKSPACE_ICON_MAP
} from './global-top-nav-shared';

/**
 * 渲染移动端顶栏导航弹出菜单。
 */
export function GlobalTopNavMobile({
  links,
  variant = 'surface',
  workspaceRoutes,
  showAuthAction = false,
  showLocaleToggle = false
}: GlobalTopNavProps) {
  const { t } = useAppTranslation();
  const location = useLocation();
  const session = useAuthSessionStore(state => state.session);
  const { logout, isLoggingOut } = useAuthSessionActions();
  const {
    closeLabel,
    closeMobileMenu,
    handleLocaleToggle,
    localeToggleLabel
  } = useTopNavControls();

  const brandLabel = useMemo(
    () =>
      variant === 'home'
        ? t('entryNav.homeBrand')
        : t('entryNav.brand'),
    [t, variant]
  );

  const isWorkspace = variant === 'workspace';
  const { actionButtonVariant } = resolveNavClassNames(variant);

  const accountAction = {
    label: session?.accessToken
      ? t('entryNav.openWorkspace')
      : t('entryNav.signIn'),
    to: '/classroom/input'
  };

  function renderNavLink(link: GlobalTopNavLink) {
    const isCurrent = isActiveLink(location.pathname, link.href);
    const sharedClassName = cn(
      isCurrent ? 'text-primary' : null,
      'rounded-full px-4 py-3 text-left'
    );

    if (link.href.startsWith('#')) {
      return (
        <a
          key={`${link.href}-mobile`}
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
        key={`${link.href}-mobile`}
        to={link.href}
        className={sharedClassName}
        onClick={closeMobileMenu}
      >
        {link.label}
      </Link>
    );
  }

  return (
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
          aria-label={closeLabel}
          onClick={closeMobileMenu}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {isWorkspace && workspaceRoutes ? (
          workspaceRoutes.map(route => {
            const isCurrent = isActiveLink(location.pathname, route.href);
            const IconComp = WORKSPACE_ICON_MAP[route.icon];
            return (
              <Link
                key={route.href}
                to={route.href}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition',
                  isCurrent ? 'text-primary' : 'text-foreground'
                )}
                onClick={closeMobileMenu}
              >
                {IconComp ? <IconComp className="h-4 w-4" /> : null}
                {route.label}
              </Link>
            );
          })
        ) : (
          links.map(link => renderNavLink(link))
        )}

        {showAuthAction && !isWorkspace ? (
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
            {localeToggleLabel}
          </Button>
        ) : null}
      </div>
    </DialogContent>
  );
}
