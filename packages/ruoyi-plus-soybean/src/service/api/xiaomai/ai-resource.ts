import { request } from '@/service/request';

/** 获取AI 模型 / 音色等可调度资源列表 */
export function fetchGetAiResourceList (params?: Api.Xiaomai.AiResourceSearchParams) {
    return request<Api.Xiaomai.AiResourceList>({
        url: '/xiaomai/aiResource/list',
        method: 'get',
        params
    });
}
/** 新增AI 模型 / 音色等可调度资源 */
export function fetchCreateAiResource (data: Api.Xiaomai.AiResourceOperateParams) {
    return request<boolean>({
        url: '/xiaomai/aiResource',
        method: 'post',
        data
    });
}

/** 修改AI 模型 / 音色等可调度资源 */
export function fetchUpdateAiResource (data: Api.Xiaomai.AiResourceOperateParams) {
    return request<boolean>({
        url: '/xiaomai/aiResource',
        method: 'put',
        data
    });
}

/** 批量删除AI 模型 / 音色等可调度资源 */
export function fetchBatchDeleteAiResource (ids: CommonType.IdType[]) {
    return request<boolean>({
        url: `/xiaomai/aiResource/${ids.join(',')}`,
        method: 'delete'
    });
}
