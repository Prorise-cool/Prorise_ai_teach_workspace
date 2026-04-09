import { request } from '@/service/request';

/** 获取用户配置列表 */
export function fetchGetUserProfileList(params?: Api.Xiaomai.UserProfileSearchParams) {
  return request<Api.Xiaomai.UserProfileList>({
    url: '/xiaomai/userProfile/list',
    method: 'get',
    params
  });
}
/** 新增用户配置 */
export function fetchCreateUserProfile(data: Api.Xiaomai.UserProfileOperateParams) {
  return request<boolean>({
    url: '/xiaomai/userProfile',
    method: 'post',
    data
  });
}

/** 修改用户配置 */
export function fetchUpdateUserProfile(data: Api.Xiaomai.UserProfileOperateParams) {
  return request<boolean>({
    url: '/xiaomai/userProfile',
    method: 'put',
    data
  });
}

/** 批量删除用户配置 */
export function fetchBatchDeleteUserProfile(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: `/xiaomai/userProfile/${ids.join(',')}`,
    method: 'delete'
  });
}
