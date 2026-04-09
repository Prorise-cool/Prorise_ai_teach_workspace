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
    /** ai provider */
    type AiProvider = Common.CommonRecord<{
      /** 主键 */
      id: CommonType.IdType;
      /** 租户编号 */
      tenantId: CommonType.IdType;
      /** Provider 实例编码，如 volcengine-prod */
      providerCode: string;
      /** Provider 实例名称 */
      providerName: string;
      /** 供应商编码，如 volcengine/deepseek/openai */
      vendorCode: string;
      /** 鉴权类型，如 api_key/app_key_secret/access_token/custom */
      authType: string;
      /** 基础请求地址 */
      endpointUrl: string;
      /** 应用 ID */
      appId: string;
      /** API Key（敏感） */
      apiKey: string;
      /** API Secret（敏感） */
      apiSecret: string;
      /** Access Token（敏感） */
      accessToken: string;
      /** 扩展鉴权配置 JSON 字符串 */
      extraAuthJson: string;
      /** 状态（0正常 1停用） */
      status: string;
      /** 排序号 */
      sortOrder: number;
      /** 备注 */
      remark: string;
      /** 删除标志（0代表存在 1代表删除） */
      delFlag: string;
    }>;

    /** ai provider search params */
    type AiProviderSearchParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.AiProvider,
        | 'providerCode'
        | 'providerName'
        | 'vendorCode'
        | 'authType'
        | 'endpointUrl'
        | 'appId'
        | 'apiKey'
        | 'apiSecret'
        | 'accessToken'
        | 'extraAuthJson'
        | 'status'
        | 'sortOrder'
      > &
        Api.Common.CommonSearchParams
    >;

    /** ai provider operate params */
    type AiProviderOperateParams = CommonType.RecordNullable<
      Pick<
        Api.Xiaomai.AiProvider,
        | 'id'
        | 'providerCode'
        | 'providerName'
        | 'vendorCode'
        | 'authType'
        | 'endpointUrl'
        | 'appId'
        | 'apiKey'
        | 'apiSecret'
        | 'accessToken'
        | 'extraAuthJson'
        | 'status'
        | 'sortOrder'
        | 'remark'
      >
    >;

    /** ai provider list */
    type AiProviderList = Api.Common.PaginatingQueryRecord<AiProvider>;
  }
}
