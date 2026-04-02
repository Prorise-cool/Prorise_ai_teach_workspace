/**
 * 文件说明：应用级 Provider 聚合层。
 * 后续新增 i18n、theme、toast 等全局能力时，应优先在这里扩展。
 */
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';

import { appI18n } from '@/app/i18n';
import { QueryProvider } from '@/app/provider/query-provider';
import { FeedbackProvider } from '@/shared/feedback';

/**
 * 聚合应用级 Provider，作为全局依赖注入入口。
 *
 * @param props - Provider 参数。
 * @param props.children - 需要被全局能力包裹的应用节点。
 * @returns 组合后的 Provider 节点。
 */
export function AppProvider({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={appI18n}>
      <QueryProvider>
        <FeedbackProvider>{children}</FeedbackProvider>
      </QueryProvider>
    </I18nextProvider>
  );
}
