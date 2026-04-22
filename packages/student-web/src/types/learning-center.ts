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

export interface LearningCenterFavoriteFolder {
  folderId: string;
  folderName: string;
  createTime?: string | null;
}

export interface LearningCenterFavoriteFolderState {
  folders: LearningCenterFavoriteFolder[];
  assignments: Record<string, string>;
}

/**
 * 学习中心聚合响应（TASK-007）。
 * FastAPI `/learning-center/aggregate` 返回，覆盖三张 sidebar 卡需要的真实数据。
 * 上游 RuoYi 未就绪时对应字段为 null，前端按空态渲染，不硬编码占位。
 */
export interface LatestRecommendation {
  summary: string;
  targetRefId: string;
  /** ISO-8601 时间戳 */
  sourceTime: string;
}

export interface ActiveLearningPath {
  pathId: string;
  title: string;
  completedStepCount: number;
  totalStepCount: number;
  versionNo: number;
}

export interface LearningCenterAggregateResponse {
  averageQuizScore: number | null;
  latestRecommendation: LatestRecommendation | null;
  activeLearningPath: ActiveLearningPath | null;
}
