import { request } from '@/service/request';

/** 获取模块阶段到运行资源的绑定关系列表 */
export function fetchGetAiModuleBindingList (params?: Api.Xiaomai.AiModuleBindingSearchParams) {
    return request<Api.Xiaomai.AiModuleBindingList>({
        url: '/xiaomai/aiModuleBinding/list',
        method: 'get',
        params
    });
}
/** 新增模块阶段到运行资源的绑定关系 */
export function fetchCreateAiModuleBinding (data: Api.Xiaomai.AiModuleBindingOperateParams) {
    return request<boolean>({
        url: '/xiaomai/aiModuleBinding',
        method: 'post',
        data
    });
}

/** 修改模块阶段到运行资源的绑定关系 */
export function fetchUpdateAiModuleBinding (data: Api.Xiaomai.AiModuleBindingOperateParams) {
    return request<boolean>({
        url: '/xiaomai/aiModuleBinding',
        method: 'put',
        data
    });
}

/** 批量删除模块阶段到运行资源的绑定关系 */
export function fetchBatchDeleteAiModuleBinding (ids: CommonType.IdType[]) {
    return request<boolean>({
        url: `/xiaomai/aiModuleBinding/${ids.join(',')}`,
        method: 'delete'
    });
}
