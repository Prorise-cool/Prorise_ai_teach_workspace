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
    /** landing lead */
    type LandingLead = Common.CommonRecord<{
      /** 主键 */
      id: CommonType.IdType;
      /** 租户编号 */
      tenantId: CommonType.IdType;
      /** 联系人姓名 */
      contactName: string;
      /** 机构 / 称呼 */
      organizationName: string;
      /** 联系邮箱 */
      contactEmail: string;
      /** 咨询主题 */
      subject: string;
      /** 留言内容 */
      message: string;
      /** 来源页面 */
      sourcePage: string;
      /** 提交语言 */
      sourceLocale: string;
      /** 处理状态 */
      processingStatus: string;
      /** 后台备注 */
      remark: string;
      /** 删除标志（0-存在 2-删除） */
      delFlag: string;
    }>;

    /** landing lead search params */
    type LandingLeadSearchParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.LandingLead,
        | 'contactName'
        | 'organizationName'
        | 'contactEmail'
        | 'subject'
        | 'sourcePage'
        | 'sourceLocale'
        | 'processingStatus'
      > &
        Api.Common.CommonSearchParams
    >;

    /** landing lead operate params */
    type LandingLeadOperateParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.LandingLead,
        | 'id'
        | 'contactName'
        | 'organizationName'
        | 'contactEmail'
        | 'subject'
        | 'message'
        | 'sourceLocale'
        | 'processingStatus'
        | 'remark'
      >
    >;

    /** landing lead list */
    type LandingLeadList = Api.Common.PaginatingQueryRecord<LandingLead>;
  }
}
