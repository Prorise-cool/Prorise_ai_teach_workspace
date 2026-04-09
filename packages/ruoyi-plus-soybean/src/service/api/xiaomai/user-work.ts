import { request } from '@/service/request';

/** 获取用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表 */
export function fetchGetUserWorkList(params?: Api.Xiaomai.UserWorkSearchParams) {
  return request<Api.Xiaomai.UserWorkList>({
    url: '/xiaomai/userWork/list',
    method: 'get',
    params
  });
}
/** 新增用户作品（视频/课堂）—— 社区瀑布流与管理后台共用 */
export function fetchCreateUserWork(data: Api.Xiaomai.UserWorkOperateParams) {
  return request<boolean>({
    url: '/xiaomai/userWork',
    method: 'post',
    data
  });
}

/** 修改用户作品（视频/课堂）—— 社区瀑布流与管理后台共用 */
export function fetchUpdateUserWork(data: Api.Xiaomai.UserWorkOperateParams) {
  return request<boolean>({
    url: '/xiaomai/userWork',
    method: 'put',
    data
  });
}

/** 批量删除用户作品（视频/课堂）—— 社区瀑布流与管理后台共用 */
export function fetchBatchDeleteUserWork(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: `/xiaomai/userWork/${ids.join(',')}`,
    method: 'delete'
  });
}
