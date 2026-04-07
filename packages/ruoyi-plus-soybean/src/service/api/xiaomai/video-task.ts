import { request } from '@/service/request';

/** 获取视频任务列表 */
export function fetchGetVideoTaskList (params?: Api.Xiaomai.VideoTaskSearchParams) {
    return request<Api.Xiaomai.VideoTaskList>({
        url: '/video/task/list',
        method: 'get',
        params
    });
}
/** 新增视频任务 */
export function fetchCreateVideoTask (data: Api.Xiaomai.VideoTaskOperateParams) {
    return request<boolean>({
        url: '/video/task',
        method: 'post',
        data
    });
}

/** 修改视频任务 */
export function fetchUpdateVideoTask (data: Api.Xiaomai.VideoTaskOperateParams) {
    return request<boolean>({
        url: '/video/task',
        method: 'put',
        data
    });
}

/** 批量删除视频任务 */
export function fetchBatchDeleteVideoTask (ids: CommonType.IdType[]) {
    return request<boolean>({
        url: `/video/task/${ids.join(',')}`,
        method: 'delete'
    });
}
