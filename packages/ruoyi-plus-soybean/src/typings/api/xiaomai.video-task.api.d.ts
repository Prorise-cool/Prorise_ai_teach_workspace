/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  /**
   * namespace Xiaomai
   *
   * backend api module: "Xiaomai"
   */
  namespace Xiaomai {
    /** video task */
    type VideoTask = Common.CommonRecord<{
      /** 主键 */
      id: CommonType.IdType;
      /** 租户编号 */
      tenantId: CommonType.IdType;
      /** 任务ID */
      taskId: string;
      /** 用户ID（关联 sys_user.user_id） */
      userId: number;
      /** 任务类型 */
      taskType: string;
      /** 任务状态 */
      taskState: string;
      /** 任务摘要 */
      summary: string;
      /** 结果资源标识 */
      resultRef: string;
      /** 结果详情标识 */
      detailRef: string;
      /** 失败摘要 */
      errorSummary: string;
      /** 来源会话ID */
      sourceSessionId: string;
      /** 来源产物引用 */
      sourceArtifactRef: string;
      /** 回看定位提示 */
      replayHint: string;
      /** 开始时间 */
      startTime: string;
      /** 完成时间 */
      completeTime: string;
      /** 失败时间 */
      failTime: string;
      /** 删除标志（0代表存在 1代表删除） */
      delFlag: string;
    }>;

    /** video task search params */
    type VideoTaskSearchParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.VideoTask,
        | 'taskId'
        | 'userId'
        | 'taskType'
        | 'taskState'
        | 'summary'
        | 'resultRef'
        | 'detailRef'
        | 'errorSummary'
        | 'sourceSessionId'
        | 'sourceArtifactRef'
        | 'replayHint'
      > &
        Api.Common.CommonSearchParams
    >;

    /** video task operate params */
    type VideoTaskOperateParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.VideoTask,
        | 'id'
        | 'taskId'
        | 'userId'
        | 'taskType'
        | 'taskState'
        | 'summary'
        | 'resultRef'
        | 'detailRef'
        | 'errorSummary'
        | 'sourceSessionId'
        | 'sourceArtifactRef'
        | 'replayHint'
        | 'startTime'
        | 'completeTime'
        | 'failTime'
      >
    >;

    /** video task list */
    type VideoTaskList = Api.Common.PaginatingQueryRecord<VideoTask>;
  }
}
