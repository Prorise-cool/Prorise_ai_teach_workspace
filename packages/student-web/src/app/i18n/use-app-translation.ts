/**
 * 文件说明：student-web 统一翻译 hook。
 * 通过副作用导入确保 i18n 在组件单测与直接渲染时也会先完成初始化。
 */
import '@/app/i18n';

import { useTranslation } from 'react-i18next';

export function useAppTranslation() {
  return useTranslation();
}
