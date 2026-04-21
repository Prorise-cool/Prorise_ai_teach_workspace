/**
 * 文件说明：学习中心（Epic 9）稳定消费的领域类型。
 * 对齐 RuoYi `XmLearningCenterController` 返回的 `LearningCenterRecordVo` 与分页包装。
 */

export interface LearningCenterRecord {
  recordId: string;
  userId: string;
  resultType: string;
  sourceType: string;
  sourceTable: string;
  sourceResultId: string;
  sourceSessionId: string;
  displayTitle: string;
  summary: string;
  status: string;
  detailRef: string;
  sourceTime: string;
  favorite: boolean;
  favoriteTime?: string | null;
}

export interface LearningCenterPage<TRecord = LearningCenterRecord> {
  total: number;
  rows: TRecord[];
  code?: number;
  msg?: string;
}

