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
        /** ai resource */
        type AiResource = Common.CommonRecord<{
            /** 主键 */
                id: CommonType.IdType; 
            /** 租户编号 */
                tenantId: CommonType.IdType; 
            /** 关联 Provider 主键 */
                providerId: number; 
            /** 能力类型，llm/tts */
                capability: string; 
            /** 资源编码 */
                resourceCode: string; 
            /** 资源名称 */
                resourceName: string; 
            /** 资源类型，如 chat/reasoning/vision/voice */
                resourceType: string; 
            /** FastAPI 运行时 Provider ID，需符合 vendor-model_or_voice 规范 */
                runtimeProviderId: string; 
            /** 上游模型名称 */
                modelName: string; 
            /** 音色编码，TTS 使用 */
                voiceCode: string; 
            /** 语言编码 */
                languageCode: string; 
            /** 资源级扩展配置 JSON 字符串 */
                resourceSettingsJson: string; 
            /** 状态（0正常 1停用） */
                status: string; 
            /** 排序号 */
                sortOrder: number; 
            /** 备注 */
                remark: string; 
            /** 删除标志（0代表存在 1代表删除） */
                delFlag: string; 
        }>;

        /** ai resource search params */
        type AiResourceSearchParams = CommonType.RecordNullable<
            Pick<
                Api.Xiaomai.AiResource,
                        | 'providerId'
                        | 'capability'
                        | 'resourceCode'
                        | 'resourceName'
                        | 'resourceType'
                        | 'runtimeProviderId'
                        | 'modelName'
                        | 'voiceCode'
                        | 'languageCode'
                        | 'resourceSettingsJson'
                        | 'status'
                        | 'sortOrder'
            > &
            Api.Common.CommonSearchParams
        >;

        /** ai resource operate params */
        type AiResourceOperateParams = CommonType.RecordNullable<
            Pick<
                Api.Xiaomai.AiResource,
                        | 'id'
                        | 'providerId'
                        | 'capability'
                        | 'resourceCode'
                        | 'resourceName'
                        | 'resourceType'
                        | 'runtimeProviderId'
                        | 'modelName'
                        | 'voiceCode'
                        | 'languageCode'
                        | 'resourceSettingsJson'
                        | 'status'
                        | 'sortOrder'
                        | 'remark'
            >
        >;

        /** ai resource list */
        type AiResourceList = Api.Common.PaginatingQueryRecord<AiResource>;
    }
}
