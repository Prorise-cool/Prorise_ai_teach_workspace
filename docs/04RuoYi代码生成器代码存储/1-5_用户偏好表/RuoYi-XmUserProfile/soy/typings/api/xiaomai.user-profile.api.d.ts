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
        /** user profile */
        type UserProfile = Common.CommonRecord<{
            /** 主键 */
                id: CommonType.IdType; 
            /** 用户ID */
                userId: CommonType.IdType; 
            /** 头像URL */
                avatarUrl: string; 
            /** 个人简介 */
                bio: string; 
            /** 性格类型 */
                personalityType: string; 
            /** AI导师偏好 */
                teacherTags: string; 
            /** 语言偏好 */
                language: string; 
            /** 是否完成配置 */
                isCompleted: number; 
        }>;

        /** user profile search params */
        type UserProfileSearchParams = CommonType.RecordNullable<
            Pick<
                Api.Xiaomai.UserProfile,
                        | 'id'
                        | 'userId'
                        | 'bio'
                        | 'personalityType'
                        | 'language'
                        | 'isCompleted'
            > &
            Api.Common.CommonSearchParams
        >;

        /** user profile operate params */
        type UserProfileOperateParams = CommonType.RecordNullable<
            Pick<
                Api.Xiaomai.UserProfile,
                        | 'id'
                        | 'userId'
                        | 'avatarUrl'
                        | 'bio'
                        | 'personalityType'
                        | 'teacherTags'
                        | 'language'
            >
        >;

        /** user profile list */
        type UserProfileList = Api.Common.PaginatingQueryRecord<UserProfile>;
    }
}
