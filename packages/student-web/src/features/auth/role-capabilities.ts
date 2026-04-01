/**
 * 文件说明：根据 AuthUser.roles 与 permissions 推导学生端入口级能力矩阵。
 */
import type { AuthPermission, AuthRole, AuthUser } from '@/types/auth';

export type EntryActionState = 'login-required' | 'enabled' | 'disabled';

export type RoleCapabilityMatrix = {
  roleLabel: string;
  videoState: EntryActionState;
  classroomState: EntryActionState;
  showTeacherPilotNote: boolean;
  showAdminBoundaryNote: boolean;
  supportingHint: string;
};

function hasPermission(permissions: AuthPermission[], permissionKey: string) {
  return permissions.some(permission => permission.key === permissionKey);
}

function pickPrimaryRole(roles: AuthRole[]) {
  return roles[0]?.key ?? 'guest';
}

/** 基于当前用户与权限推导入口级显隐语义。 */
export function resolveRoleCapabilities(user: AuthUser | null): RoleCapabilityMatrix {
  if (!user) {
    return {
      roleLabel: '访客',
      videoState: 'login-required',
      classroomState: 'login-required',
      showTeacherPilotNote: false,
      showAdminBoundaryNote: false,
      supportingHint: '先登录后即可继续进入视频或课堂输入页。'
    };
  }

  const canCreateVideoTask = hasPermission(user.permissions, 'video:task:add');
  const canCreateClassroomSession = hasPermission(
    user.permissions,
    'classroom:session:add'
  );
  const primaryRole = pickPrimaryRole(user.roles);

  return {
    roleLabel:
      primaryRole === 'teacher'
        ? '教师'
        : primaryRole === 'admin'
          ? '管理员'
          : primaryRole === 'student'
            ? '学生'
            : primaryRole,
    videoState: canCreateVideoTask ? 'enabled' : 'disabled',
    classroomState: canCreateClassroomSession ? 'enabled' : 'disabled',
    showTeacherPilotNote: primaryRole === 'teacher',
    showAdminBoundaryNote: primaryRole === 'admin',
    supportingHint:
      canCreateVideoTask || canCreateClassroomSession
        ? '当前账号会按照权限展示可用入口，不在学生端暴露管理后台导航。'
        : '当前账号已登录，但没有学生端任务创建权限，可联系管理员开通学习入口。'
  };
}
