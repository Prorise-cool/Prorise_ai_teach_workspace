/**
 * 文件说明：学习中心记录的"已删除/已取消"判定。
 *
 * 后端 `delete_task` 把视频任务 status 设为 CANCELLED 并把 summary 覆盖为
 * "任务已删除"，但 xm_learning_record.deleted_flag 不一定同步写入，聚合查询过
 * 滤 deleted_flag='0' 拦不住，这里在前端统一判一道。
 */
import type { LearningCenterRecord } from '@/types/learning-center';

const DELETED_STATUSES = new Set(['deleted', 'cancelled', 'canceled', 'removed']);
const DELETED_TITLE_MARKERS = ['任务已删除', '已删除'];

export function isRecordDeleted(record: LearningCenterRecord): boolean {
  const status = (record.status || '').toLowerCase();
  if (DELETED_STATUSES.has(status)) return true;

  const title = record.displayTitle || '';
  const summary = record.summary || '';
  // 明确命中占位文案才判删除 —— 避免把"xxx 已删除"这种真实学习内容误伤
  if (DELETED_TITLE_MARKERS.some((marker) => title === marker || summary === marker)) {
    return true;
  }

  return false;
}
