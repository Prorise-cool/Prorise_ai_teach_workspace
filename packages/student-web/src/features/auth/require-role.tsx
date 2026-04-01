/**
 * 文件说明：在已登录前提下继续执行角色 / 权限粒度限制。
 */
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { NO_ACCESS_ROUTE } from '@/features/navigation/route-paths';
import { useAuthStore } from '@/stores/auth-store';

type RequireRoleProps = PropsWithChildren<{
  allowedRoles?: string[];
  requiredPermissions?: string[];
}>;

function hasPermission(permissionKeys: string[], requiredPermissions: string[]) {
  return requiredPermissions.every(permission =>
    permissionKeys.includes(permission)
  );
}

function hasRole(roleKeys: string[], allowedRoles: string[]) {
  return allowedRoles.length === 0 || roleKeys.some(role => allowedRoles.includes(role));
}

export function RequireRole({
  children,
  allowedRoles = [],
  requiredPermissions = []
}: RequireRoleProps) {
  const session = useAuthStore(state => state.session);
  const location = useLocation();

  if (!session) {
    return null;
  }

  const roleKeys = session.user.roles.map(role => role.key);
  const permissionKeys = session.user.permissions.map(permission => permission.key);
  const hasAccess =
    hasRole(roleKeys, allowedRoles) &&
    hasPermission(permissionKeys, requiredPermissions);

  if (!hasAccess) {
    return (
      <Navigate
        replace
        to={NO_ACCESS_ROUTE}
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          message: '当前账号暂无访问该页面的权限。'
        }}
      />
    );
  }

  return <>{children}</>;
}
