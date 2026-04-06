/**
 * 文件说明：顶栏导航共享交互状态 hook。
 * 负责收敛主题切换、语言切换与移动菜单开关逻辑，供多个导航变体复用。
 */
import type { MouseEvent } from 'react';
import { useCallback, useState } from 'react';

import { appI18n } from '@/app/i18n';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

/**
 * 提供顶栏共享交互状态与控制器。
 *
 * @returns 顶栏共享控制状态。
 */
export function useTopNavControls() {
  const { t } = useAppTranslation();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nextLocale =
    appI18n.resolvedLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleLocaleToggle = useCallback(
    (event?: MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      event?.stopPropagation();
      void appI18n.changeLanguage(nextLocale);
    },
    [nextLocale]
  );

  return {
    themeMode,
    toggleThemeMode,
    mobileMenuOpen,
    setMobileMenuOpen,
    closeMobileMenu,
    handleLocaleToggle,
    localeToggleLabel: t('entryNav.localeToggle'),
    themeToggleAriaLabel: t('entryNav.themeToggle'),
    themeModeLabel:
      themeMode === 'dark' ? t('common.themeLight') : t('common.themeDark'),
    openMenuLabel: t('common.openMenu'),
    closeLabel: t('common.close'),
  };
}
