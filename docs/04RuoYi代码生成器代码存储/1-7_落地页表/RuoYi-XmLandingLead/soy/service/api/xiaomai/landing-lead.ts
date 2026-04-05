import { request } from '@/service/request';

/** 获取营销落地页线索列表 */
export function fetchGetLandingLeadList (params?: Api.Xiaomai.LandingLeadSearchParams) {
    return request<Api.Xiaomai.LandingLeadList>({
        url: '/xiaomai/landingLead/list',
        method: 'get',
        params
    });
}
/** 新增营销落地页线索 */
export function fetchCreateLandingLead (data: Api.Xiaomai.LandingLeadOperateParams) {
    return request<boolean>({
        url: '/xiaomai/landingLead',
        method: 'post',
        data
    });
}

/** 修改营销落地页线索 */
export function fetchUpdateLandingLead (data: Api.Xiaomai.LandingLeadOperateParams) {
    return request<boolean>({
        url: '/xiaomai/landingLead',
        method: 'put',
        data
    });
}

/** 批量删除营销落地页线索 */
export function fetchBatchDeleteLandingLead (ids: CommonType.IdType[]) {
    return request<boolean>({
        url: `/xiaomai/landingLead/${ids.join(',')}`,
        method: 'delete'
    });
}
