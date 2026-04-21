package org.dromara.xiaomai.learningcenter.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.xiaomai.learningcenter.domain.XmLearningFavoriteFolder;
import org.dromara.xiaomai.learningcenter.domain.XmLearningFavoriteFolderAssignment;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderAssignBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderCreateBo;
import org.dromara.xiaomai.learningcenter.domain.bo.LearningCenterFavoriteFolderRemoveBo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterFavoriteFolderStateVo;
import org.dromara.xiaomai.learningcenter.domain.vo.LearningCenterFavoriteFolderVo;
import org.dromara.xiaomai.learningcenter.mapper.XmLearningFavoriteFolderAssignmentMapper;
import org.dromara.xiaomai.learningcenter.mapper.XmLearningFavoriteFolderMapper;
import org.dromara.xiaomai.learningcenter.service.ILearningCenterFavoriteFolderService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.baomidou.mybatisplus.core.toolkit.Wrappers.lambdaQuery;

/**
 * 学习中心收藏文件夹服务实现。
 *
 * @author Codex
 */
@Service
@RequiredArgsConstructor
public class LearningCenterFavoriteFolderServiceImpl implements ILearningCenterFavoriteFolderService {

    private static final String DEL_FLAG_NORMAL = "0";

    private final XmLearningFavoriteFolderMapper folderMapper;
    private final XmLearningFavoriteFolderAssignmentMapper assignmentMapper;

    @Override
    public LearningCenterFavoriteFolderStateVo queryState(String userId) {
        List<XmLearningFavoriteFolder> folders = folderMapper.selectList(
            lambdaQuery(XmLearningFavoriteFolder.class)
                .eq(XmLearningFavoriteFolder::getUserId, userId)
                .eq(XmLearningFavoriteFolder::getDelFlag, DEL_FLAG_NORMAL)
                .orderByAsc(XmLearningFavoriteFolder::getCreateTime)
        );

        Map<String, String> assignments = new HashMap<>();
        List<XmLearningFavoriteFolderAssignment> rows = assignmentMapper.selectList(
            lambdaQuery(XmLearningFavoriteFolderAssignment.class)
                .eq(XmLearningFavoriteFolderAssignment::getUserId, userId)
                .orderByAsc(XmLearningFavoriteFolderAssignment::getAssignmentId)
        );
        for (XmLearningFavoriteFolderAssignment row : rows) {
            if (StrUtil.isBlank(row.getRecordId()) || StrUtil.isBlank(row.getFolderId())) {
                continue;
            }
            assignments.put(row.getRecordId(), row.getFolderId());
        }

        LearningCenterFavoriteFolderStateVo state = new LearningCenterFavoriteFolderStateVo();
        state.setFolders(
            folders.stream().map(this::toFolderVo).toList()
        );
        state.setAssignments(assignments);
        return state;
    }

    @Override
    public LearningCenterFavoriteFolderVo createFolder(LearningCenterFavoriteFolderCreateBo bo) {
        String normalizedName = normalizeFolderName(bo.getFolderName());
        if (StrUtil.isBlank(normalizedName)) {
            throw new ServiceException("文件夹名称不能为空");
        }

        boolean exists = folderMapper.exists(
            lambdaQuery(XmLearningFavoriteFolder.class)
                .eq(XmLearningFavoriteFolder::getUserId, bo.getUserId())
                .eq(XmLearningFavoriteFolder::getDelFlag, DEL_FLAG_NORMAL)
                .apply("LOWER(folder_name) = {0}", normalizedName.toLowerCase(Locale.ROOT))
        );
        if (exists) {
            throw new ServiceException("文件夹名称已存在");
        }

        XmLearningFavoriteFolder folder = new XmLearningFavoriteFolder();
        folder.setFolderId("fld_" + IdUtil.fastSimpleUUID());
        folder.setUserId(bo.getUserId());
        folder.setFolderName(normalizedName);
        folder.setDelFlag(DEL_FLAG_NORMAL);
        folderMapper.insert(folder);

        return toFolderVo(folder);
    }

    @Override
    public Boolean removeFolder(LearningCenterFavoriteFolderRemoveBo bo) {
        if (isBuiltinFolderId(bo.getFolderId())) {
            throw new ServiceException("内置文件夹不可删除");
        }

        XmLearningFavoriteFolder existing = folderMapper.selectOne(
            lambdaQuery(XmLearningFavoriteFolder.class)
                .eq(XmLearningFavoriteFolder::getUserId, bo.getUserId())
                .eq(XmLearningFavoriteFolder::getFolderId, bo.getFolderId())
                .eq(XmLearningFavoriteFolder::getDelFlag, DEL_FLAG_NORMAL)
                .last("limit 1")
        );
        if (existing == null) {
            return true;
        }

        folderMapper.deleteById(existing.getFolderId());
        assignmentMapper.delete(
            lambdaQuery(XmLearningFavoriteFolderAssignment.class)
                .eq(XmLearningFavoriteFolderAssignment::getUserId, bo.getUserId())
                .eq(XmLearningFavoriteFolderAssignment::getFolderId, bo.getFolderId())
        );
        return true;
    }

    @Override
    public Boolean assignFolder(LearningCenterFavoriteFolderAssignBo bo) {
        String folderId = bo.getFolderId();
        folderId = StrUtil.isBlank(folderId) ? null : folderId.trim();
        if (folderId == null) {
            assignmentMapper.delete(
                lambdaQuery(XmLearningFavoriteFolderAssignment.class)
                    .eq(XmLearningFavoriteFolderAssignment::getUserId, bo.getUserId())
                    .eq(XmLearningFavoriteFolderAssignment::getRecordId, bo.getRecordId())
            );
            return true;
        }

        if (!isBuiltinFolderId(folderId)) {
            boolean folderExists = folderMapper.exists(
                lambdaQuery(XmLearningFavoriteFolder.class)
                    .eq(XmLearningFavoriteFolder::getUserId, bo.getUserId())
                    .eq(XmLearningFavoriteFolder::getFolderId, folderId)
                    .eq(XmLearningFavoriteFolder::getDelFlag, DEL_FLAG_NORMAL)
            );
            if (!folderExists) {
                throw new ServiceException("文件夹不存在或已删除");
            }
        }

        XmLearningFavoriteFolderAssignment existing = assignmentMapper.selectOne(
            lambdaQuery(XmLearningFavoriteFolderAssignment.class)
                .eq(XmLearningFavoriteFolderAssignment::getUserId, bo.getUserId())
                .eq(XmLearningFavoriteFolderAssignment::getRecordId, bo.getRecordId())
                .last("limit 1")
        );
        if (existing == null) {
            XmLearningFavoriteFolderAssignment assignment = new XmLearningFavoriteFolderAssignment();
            assignment.setUserId(bo.getUserId());
            assignment.setRecordId(bo.getRecordId());
            assignment.setFolderId(folderId);
            return assignmentMapper.insert(assignment) > 0;
        }

        existing.setFolderId(folderId);
        return assignmentMapper.updateById(existing) > 0;
    }

    private LearningCenterFavoriteFolderVo toFolderVo(XmLearningFavoriteFolder folder) {
        LearningCenterFavoriteFolderVo vo = new LearningCenterFavoriteFolderVo();
        vo.setFolderId(folder.getFolderId());
        vo.setFolderName(folder.getFolderName());
        vo.setCreateTime(folder.getCreateTime());
        return vo;
    }

    private static String normalizeFolderName(String folderName) {
        if (folderName == null) {
            return "";
        }
        return folderName.trim().replaceAll("\\s+", " ");
    }

    private static boolean isBuiltinFolderId(String folderId) {
        return folderId != null && folderId.startsWith("builtin-folder:");
    }
}
