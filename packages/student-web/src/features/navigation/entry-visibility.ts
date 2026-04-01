/**
 * 文件说明：把能力矩阵映射为首页可消费的入口展示模型。
 */
import {
  CLASSROOM_INPUT_ROUTE,
  VIDEO_INPUT_ROUTE
} from '@/features/navigation/route-paths';
import {
  resolveRoleCapabilities,
  type EntryActionState
} from '@/features/auth/role-capabilities';
import type { AuthUser } from '@/types/auth';

export type HomeEntryDescriptor = {
  key: 'classroom' | 'video';
  title: string;
  eyebrow: string;
  description: string;
  route: string;
  ctaLabel: string;
  actionState: EntryActionState;
  accentClassName: string;
  summary: string;
};

/** 生成首页双入口卡片所需的展示信息。 */
export function getHomeEntryDescriptors(user: AuthUser | null): HomeEntryDescriptor[] {
  const capabilities = resolveRoleCapabilities(user);

  return [
    {
      key: 'classroom',
      eyebrow: '主题课堂',
      title: '我想系统学一个主题',
      description:
        '输入知识点、课程主题或教学目标，系统会组织成完整课堂流程与后续练习。',
      route: CLASSROOM_INPUT_ROUTE,
      ctaLabel:
        capabilities.classroomState === 'disabled' ? '当前账号暂无课堂入口权限' : '进入课堂输入',
      actionState: capabilities.classroomState,
      accentClassName: 'agent-accent-patient',
      summary: '适合从零理解概念、梳理结构并形成可持续学习链路。'
    },
    {
      key: 'video',
      eyebrow: '单题视频',
      title: '帮我讲清一道题',
      description:
        '针对具体题目或局部难点快速生成动画讲解，更适合碎片复习和考前冲刺。',
      route: VIDEO_INPUT_ROUTE,
      ctaLabel:
        capabilities.videoState === 'disabled' ? '当前账号暂无视频入口权限' : '进入视频输入',
      actionState: capabilities.videoState,
      accentClassName: 'agent-accent-efficient',
      summary: '适合带着现成题目或截图快速求解，不需要先搭完整课程上下文。'
    }
  ];
}
