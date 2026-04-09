import { request } from '@/service/request';

/** 获取AI 配置模块主数据列表 */
export function fetchGetAiModuleList(params?: Api.Xiaomai.AiModuleSearchParams) {
  return request<Api.Xiaomai.AiModuleList>({
    url: '/xiaomai/aiModule/list',
    method: 'get',
    params
  });
}
/** 新增AI 配置模块主数据 */
export function fetchCreateAiModule(data: Api.Xiaomai.AiModuleOperateParams) {
  return request<boolean>({
    url: '/xiaomai/aiModule',
    method: 'post',
    data
  });
}

/** 修改AI 配置模块主数据 */
export function fetchUpdateAiModule(data: Api.Xiaomai.AiModuleOperateParams) {
  return request<boolean>({
    url: '/xiaomai/aiModule',
    method: 'put',
    data
  });
}

/** 批量删除AI 配置模块主数据 */
export function fetchBatchDeleteAiModule(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: `/xiaomai/aiModule/${ids.join(',')}`,
    method: 'delete'
  });
}
