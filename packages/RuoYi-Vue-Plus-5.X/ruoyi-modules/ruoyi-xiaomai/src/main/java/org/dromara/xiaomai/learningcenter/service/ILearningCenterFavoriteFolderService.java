package org.dromara.xiaomai.learningcenter.service;

import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderAssignBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderCreateBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderRemoveBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterFavoriteFolderStateVo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterFavoriteFolderVo;

/**
 * 学习中心收藏文件夹服务。
 *
 * @author Codex
 */
public interface ILearningCenterFavoriteFolderService {

    LearningCenterFavoriteFolderStateVo queryState(String userId);

    LearningCenterFavoriteFolderVo createFolder(LearningCenterFavoriteFolderCreateBo bo);

    Boolean removeFolder(LearningCenterFavoriteFolderRemoveBo bo);

    Boolean assignFolder(LearningCenterFavoriteFolderAssignBo bo);
}

