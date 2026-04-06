/**
 * 文件说明：认证页注册开关查询 hook。
 * 统一把后端注册开关状态接入 react-query，避免页面手写一次性 bootstrap 状态机。
 */
import { useQuery } from '@tanstack/react-query';

import type { AuthService } from '@/services/auth';
import { AUTH_DEFAULT_TENANT_ID } from '@/types/auth';

/**
 * 查询当前租户是否开启注册能力。
 *
 * @param service - 认证服务。
 * @returns 注册开关 query 结果。
 */
export function useRegisterEnabledQuery(service: AuthService) {
  return useQuery({
    queryKey: ['auth', 'register-enabled', AUTH_DEFAULT_TENANT_ID],
    queryFn: async () => service.getRegisterEnabled(AUTH_DEFAULT_TENANT_ID),
    retry: 1,
  });
}
