import { request } from '@/service/request';

/** 获取AI Provider 实例配置列表 */
export function fetchGetAiProviderList(params?: Api.Xiaomai.AiProviderSearchParams) {
  return request<Api.Xiaomai.AiProviderList>({
    url: '/xiaomai/aiProvider/list',
    method: 'get',
    params
  });
}
/** 新增AI Provider 实例配置 */
export function fetchCreateAiProvider(data: Api.Xiaomai.AiProviderOperateParams) {
  return request<boolean>({
    url: '/xiaomai/aiProvider',
    method: 'post',
    data
  });
}

/** 修改AI Provider 实例配置 */
export function fetchUpdateAiProvider(data: Api.Xiaomai.AiProviderOperateParams) {
  return request<boolean>({
    url: '/xiaomai/aiProvider',
    method: 'put',
    data
  });
}

/** 批量删除AI Provider 实例配置 */
export function fetchBatchDeleteAiProvider(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: `/xiaomai/aiProvider/${ids.join(',')}`,
    method: 'delete'
  });
}
