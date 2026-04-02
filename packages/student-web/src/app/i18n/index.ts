/**
 * 文件说明：student-web 全局 i18n 初始化。
 * 当前先承接默认语言、资源注册与文档 `lang` 同步，后续语言切换继续在此扩展。
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { enUsResources } from '@/app/i18n/resources/en-us';
import { zhCnResources } from '@/app/i18n/resources/zh-cn';

const DEFAULT_LOCALE = 'zh-CN';

const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;

function resolveInitialLocale() {
  const configuredLocale = import.meta.env.VITE_APP_DEFAULT_LOCALE?.trim();

  if (
    configuredLocale &&
    SUPPORTED_LOCALES.includes(configuredLocale as (typeof SUPPORTED_LOCALES)[number])
  ) {
    return configuredLocale;
  }

  return DEFAULT_LOCALE;
}

function syncDocumentLanguage(language: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = language;
}

const appI18n = i18n;

if (!appI18n.isInitialized) {
  void appI18n.use(initReactI18next).init({
    lng: resolveInitialLocale(),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: 'translation',
    ns: ['translation'],
    resources: {
      'zh-CN': {
        translation: zhCnResources
      },
      'en-US': {
        translation: enUsResources
      }
    },
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });

  syncDocumentLanguage(appI18n.resolvedLanguage ?? appI18n.language);
  appI18n.on('languageChanged', syncDocumentLanguage);
}

export { appI18n };
export const APP_SUPPORTED_LOCALES = SUPPORTED_LOCALES;
export const APP_DEFAULT_LOCALE = DEFAULT_LOCALE;
export default appI18n;
