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
    /** ai module binding */
    type AiModuleBinding = Common.CommonRecord<{
      /** 主键 */
      id: CommonType.IdType;
      /** 租户编号 */
      tenantId: CommonType.IdType;
      /** 关联模块主键 */
      moduleId: number;
      /** 阶段编码，如 storyboard/script/narration/companion/search */
      stageCode: string;
      /** 能力类型，llm/tts */
      capability: string;
      /** 角色编码，为空表示阶段默认链路 */
      roleCode: string;
      /** 关联资源主键 */
      resourceId: number;
      /** 优先级，越小越优先 */
      priority: number;
      /** 超时时间，单位秒 */
      timeoutSeconds: number;
      /** 重试次数 */
      retryAttempts: number;
      /** 健康状态来源 */
      healthSource: string;
      /** 运行时附加配置 JSON 字符串 */
      runtimeSettingsJson: string;
      /** 状态（0正常 1停用） */
      status: string;
      /** 是否默认链路（Y/N） */
      isDefault: string;
      /** 备注 */
      remark: string;
      /** 删除标志（0代表存在 1代表删除） */
      delFlag: string;
    }>;

    /** ai module binding search params */
    type AiModuleBindingSearchParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.AiModuleBinding,
        | 'moduleId'
        | 'stageCode'
        | 'capability'
        | 'roleCode'
        | 'resourceId'
        | 'priority'
        | 'timeoutSeconds'
        | 'retryAttempts'
        | 'healthSource'
        | 'runtimeSettingsJson'
        | 'status'
        | 'isDefault'
      > &
        Api.Common.CommonSearchParams
    >;

    /** ai module binding operate params */
    type AiModuleBindingOperateParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.AiModuleBinding,
        | 'id'
        | 'moduleId'
        | 'stageCode'
        | 'capability'
        | 'roleCode'
        | 'resourceId'
        | 'priority'
        | 'timeoutSeconds'
        | 'retryAttempts'
        | 'healthSource'
        | 'runtimeSettingsJson'
        | 'status'
        | 'isDefault'
        | 'remark'
      >
    >;

    /** ai module binding list */
    type AiModuleBindingList = Api.Common.PaginatingQueryRecord<AiModuleBinding>;
  }
}
