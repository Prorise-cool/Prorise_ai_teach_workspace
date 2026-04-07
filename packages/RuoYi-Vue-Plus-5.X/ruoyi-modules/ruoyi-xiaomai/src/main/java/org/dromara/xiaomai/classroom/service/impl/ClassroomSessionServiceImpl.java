package org.dromara.xiaomai.classroom.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.core.utils.MapstructUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.classroom.domain.ClassroomSession;
import org.dromara.xiaomai.classroom.domain.bo.ClassroomSessionBo;
import org.dromara.xiaomai.classroom.domain.vo.ClassroomSessionVo;
import org.dromara.xiaomai.classroom.mapper.ClassroomSessionMapper;
import org.dromara.xiaomai.classroom.service.IClassroomSessionService;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * 课堂会话服务实现。
 *
 * @author Codex
 */
@RequiredArgsConstructor
@Service
public class ClassroomSessionServiceImpl implements IClassroomSessionService {

    private final ClassroomSessionMapper baseMapper;

    @Override
    public ClassroomSessionVo queryById(Long id) {
        return baseMapper.selectVoById(id);
    }

    @Override
    public TableDataInfo<ClassroomSessionVo> queryPageList(ClassroomSessionBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<ClassroomSession> lqw = buildQueryWrapper(bo);
        Page<ClassroomSessionVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    @Override
    public List<ClassroomSessionVo> queryList(ClassroomSessionBo bo) {
        return baseMapper.selectVoList(buildQueryWrapper(bo));
    }

    @Override
    public Boolean insertByBo(ClassroomSessionBo bo) {
        ClassroomSession add = MapstructUtils.convert(bo, ClassroomSession.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    @Override
    public Boolean updateByBo(ClassroomSessionBo bo) {
        ClassroomSession update = MapstructUtils.convert(bo, ClassroomSession.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    @Override
    public Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid) {
        if (Boolean.TRUE.equals(isValid)) {
            List<ClassroomSession> list = baseMapper.selectByIds(ids);
            if (list.size() != ids.size()) {
                throw new ServiceException("您没有删除权限!");
            }
        }
        return baseMapper.deleteByIds(ids) > 0;
    }

    @Override
    public Boolean saveBatch(List<ClassroomSession> list) {
        return baseMapper.insertBatch(list);
    }

    private LambdaQueryWrapper<ClassroomSession> buildQueryWrapper(ClassroomSessionBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<ClassroomSession> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getId() != null, ClassroomSession::getId, bo.getId());
        lqw.eq(StringUtils.isNotBlank(bo.getTaskId()), ClassroomSession::getTaskId, bo.getTaskId());
        lqw.eq(bo.getUserId() != null, ClassroomSession::getUserId, bo.getUserId());
        lqw.eq(StringUtils.isNotBlank(bo.getTaskType()), ClassroomSession::getTaskType, bo.getTaskType());
        lqw.eq(StringUtils.isNotBlank(bo.getTaskState()), ClassroomSession::getTaskState, bo.getTaskState());
        lqw.like(StringUtils.isNotBlank(bo.getSummary()), ClassroomSession::getSummary, bo.getSummary());
        lqw.like(StringUtils.isNotBlank(bo.getErrorSummary()), ClassroomSession::getErrorSummary, bo.getErrorSummary());
        lqw.eq(StringUtils.isNotBlank(bo.getSourceSessionId()), ClassroomSession::getSourceSessionId, bo.getSourceSessionId());
        lqw.like(StringUtils.isNotBlank(bo.getSourceArtifactRef()), ClassroomSession::getSourceArtifactRef, bo.getSourceArtifactRef());
        lqw.like(StringUtils.isNotBlank(bo.getReplayHint()), ClassroomSession::getReplayHint, bo.getReplayHint());
        lqw.ge(params.get("beginCreateTime") != null, ClassroomSession::getCreateTime, params.get("beginCreateTime"));
        lqw.le(params.get("endCreateTime") != null, ClassroomSession::getCreateTime, params.get("endCreateTime"));
        lqw.ge(params.get("beginUpdateTime") != null, ClassroomSession::getUpdateTime, params.get("beginUpdateTime"));
        lqw.le(params.get("endUpdateTime") != null, ClassroomSession::getUpdateTime, params.get("endUpdateTime"));
        lqw.orderByDesc(ClassroomSession::getUpdateTime, ClassroomSession::getId);
        return lqw;
    }

    private void validEntityBeforeSave(ClassroomSession entity) {
        // 保留最小校验点，避免后续扩展时把规则散落在控制器里。
    }
}
