/**
 * 文件说明：顶部导航右侧的头像下拉菜单（仅登录态显示）。
 *
 * 用户头像来自 session.user.avatarUrl（RuoYi 头像上传返回），加载失败或
 * 缺省时使用昵称首字母占位。下拉提供 学习中心 / 个人资料 / 设置 / 退出登录
 * 四个入口，是 HomePage 顶栏通往登录态应用的主入口。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import { cn } from '@/lib/utils';

type UserAvatarMenuProps = {
  className?: string;
};

export function UserAvatarMenu({ className }: UserAvatarMenuProps) {
  const { t } = useAppTranslation();
  const session = useAuthSessionStore((state) => state.session);
  const { logout, isLoggingOut } = useAuthSessionActions();
  const [open, setOpen] = useState(false);
  const [avatarErrored, setAvatarErrored] = useState(false);

  if (!session) {
    return null;
  }

  const { user } = session;
  const avatarUrl = user.avatarUrl;
  const displayName = user.nickname?.trim() || user.username?.trim() || '—';
  const initial = displayName.slice(0, 1).toUpperCase();

  const handleLogout = () => {
    setOpen(false);
    void logout();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('entryNav.userMenu.trigger')}
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--xm-color-border-strong)] bg-[color:var(--xm-color-surface-glass)] text-sm font-bold text-foreground shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            className
          )}
        >
          {avatarUrl && !avatarErrored ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={() => setAvatarErrored(true)}
            />
          ) : (
            <span className="select-none">{initial}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-60 rounded-2xl border border-[color:var(--xm-color-border-strong)] bg-surface-light dark:bg-surface-dark p-2 shadow-[var(--xm-shadow-nav)]"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-bordercolor-light dark:border-bordercolor-dark bg-bg-light dark:bg-bg-dark text-sm font-bold text-text-primary dark:text-text-primary-dark">
            {avatarUrl && !avatarErrored ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="select-none">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text-primary dark:text-text-primary-dark">
              {displayName}
            </p>
            {user.username ? (
              <p className="truncate text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                @{user.username}
              </p>
            ) : null}
          </div>
        </div>

        <div className="my-1 h-px bg-bordercolor-light dark:bg-bordercolor-dark" aria-hidden />

        <nav className="flex flex-col gap-0.5 py-1">
          <Link
            to="/learning"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-primary dark:text-text-primary-dark transition hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            {t('entryNav.userMenu.learningCenter')}
          </Link>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-primary dark:text-text-primary-dark transition hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            <UserIcon className="h-4 w-4" aria-hidden />
            {t('entryNav.userMenu.profile')}
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-primary dark:text-text-primary-dark transition hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            <SettingsIcon className="h-4 w-4" aria-hidden />
            {t('entryNav.userMenu.settings')}
          </Link>
        </nav>

        <div className="my-1 h-px bg-bordercolor-light dark:bg-bordercolor-dark" aria-hidden />

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-error transition hover:bg-error/10 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {isLoggingOut
            ? t('entryNav.userMenu.loggingOut')
            : t('entryNav.userMenu.logout')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
