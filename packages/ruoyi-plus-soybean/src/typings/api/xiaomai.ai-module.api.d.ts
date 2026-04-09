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
    /** ai module */
    type AiModule = Common.CommonRecord<{
      /** 主键 */
      id: CommonType.IdType;
      /** 租户编号 */
      tenantId: CommonType.IdType;
      /** 模块编码，如 video/classroom/companion/knowledge/learning */
      moduleCode: string;
      /** 模块名称 */
      moduleName: string;
      /** 状态（0正常 1停用） */
      status: string;
      /** 排序号 */
      sortOrder: number;
      /** 备注 */
      remark: string;
      /** 删除标志（0代表存在 1代表删除） */
      delFlag: string;
    }>;

    /** ai module search params */
    type AiModuleSearchParams = CommonType.RecordNullable<
      Pick<Api.Xiaomai.AiModule, 'moduleCode' | 'moduleName' | 'status' | 'sortOrder'> & Api.Common.CommonSearchParams
    >;

    /** ai module operate params */
    type AiModuleOperateParams = CommonType.RecordNullable<
      Pick<Api.Xiaomai.AiModule, 'id' | 'moduleCode' | 'moduleName' | 'status' | 'sortOrder' | 'remark'>
    >;

    /** ai module list */
    type AiModuleList = Api.Common.PaginatingQueryRecord<AiModule>;
  }
}
