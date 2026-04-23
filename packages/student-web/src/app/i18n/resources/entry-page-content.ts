/**
 * 文件说明：聚合 Story 1.4 入口页、落地页与导航相关的 i18n 资源。
 * 资源已按主题拆分到三个子文件，本文件仅做组合与对外导出，保持外部导入路径稳定。
 *  - entry-nav-content.ts        顶栏导航与任务中心
 *  - landing-content.ts          营销落地页大段文案
 *  - entry-common-content.ts     通用文案、首页、入口路由、视频/课堂输入页
 */
import {
  zhCnEntryNavResources,
  enUsEntryNavResources,
} from './entry-nav-content';
import {
  zhCnLandingResources,
  enUsLandingResources,
} from './landing-content';
import {
  zhCnEntryCommonResources,
  enUsEntryCommonResources,
} from './entry-common-content';

export const zhCnEntryPageResources = {
  ...zhCnEntryCommonResources,
  ...zhCnEntryNavResources,
  ...zhCnLandingResources,
} as const;

export const enUsEntryPageResources = {
  ...enUsEntryCommonResources,
  ...enUsEntryNavResources,
  ...enUsLandingResources,
} as const;

export type ZhCnEntryPageResources = typeof zhCnEntryPageResources;
export type EnUsEntryPageResources = typeof enUsEntryPageResources;
