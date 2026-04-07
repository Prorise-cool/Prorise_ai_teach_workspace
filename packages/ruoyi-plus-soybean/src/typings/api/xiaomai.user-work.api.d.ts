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
        /** user work */
        type UserWork = Common.CommonRecord<{
            /** 主键（Snowflake） */
                id: CommonType.IdType; 
            /** 租户编号 */
                tenantId: CommonType.IdType; 
            /** 作品所有者（关联 sys_user.user_id） */
                userId: number; 
            /** 作品类型（video / classroom） */
                workType: string; 
            /** 来源任务ID（对应 xm_video_task.task_id 或 xm_classroom_session.task_id） */
                taskRefId: string; 
            /** 作品标题 */
                title: string; 
            /** 作品描述 */
                description: string; 
            /** 封面图 OSS ID（关联 sys_oss.oss_id） */
                coverOssId: number; 
            /** 封面图直链（冗余缓存，避免高频 JOIN sys_oss） */
                coverUrl: string; 
            /** 是否公开到社区（0-私有 1-公开） */
                isPublic: number; 
            /** 管理状态（normal/hidden/blocked）—— 管理员在 RuoYi 后台可操作 */
                status: string; 
            /** 浏览量 */
                viewCount: number; 
            /** 点赞量 */
                likeCount: number; 
            /** 乐观锁版本 */
                version: number; 
            /** 删除标志（0-存在 1-删除） */
                delFlag: number; 
        }>;

        /** user work search params */
        type UserWorkSearchParams = CommonType.RecordNullable<
            Pick<
                Api.Xiaomai.UserWork,
                        | 'userId'
                        | 'workType'
                        | 'taskRefId'
                        | 'title'
                        | 'description'
                        | 'coverOssId'
                        | 'coverUrl'
                        | 'isPublic'
                        | 'status'
                        | 'viewCount'
                        | 'likeCount'
            > &
            Api.Common.CommonSearchParams
        >;

        /** user work operate params */
        type UserWorkOperateParams = CommonType.RecordNullable<
            Pick<
                Api.Xiaomai.UserWork,
                        | 'id'
                        | 'userId'
                        | 'workType'
                        | 'taskRefId'
                        | 'title'
                        | 'description'
                        | 'coverOssId'
                        | 'coverUrl'
                        | 'isPublic'
                        | 'status'
                        | 'viewCount'
                        | 'likeCount'
            >
        >;

        /** user work list */
        type UserWorkList = Api.Common.PaginatingQueryRecord<UserWork>;
    }
}
