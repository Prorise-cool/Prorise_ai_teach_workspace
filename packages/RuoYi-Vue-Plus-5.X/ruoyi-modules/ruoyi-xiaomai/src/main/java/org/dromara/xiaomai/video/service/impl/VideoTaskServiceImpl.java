package org.dromara.xiaomai.video.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.core.utils.MapstructUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.video.domain.VideoTask;
import org.dromara.xiaomai.video.domain.bo.VideoTaskBo;
import org.dromara.xiaomai.video.domain.vo.VideoTaskVo;
import org.dromara.xiaomai.video.mapper.VideoTaskMapper;
import org.dromara.xiaomai.video.service.IVideoTaskService;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * 视频任务服务实现。
 *
 * @author Codex
 */
@RequiredArgsConstructor
@Service
public class VideoTaskServiceImpl implements IVideoTaskService {

    private final VideoTaskMapper baseMapper;

    @Override
    public VideoTaskVo queryById(Long id) {
        return baseMapper.selectVoById(id);
    }

    @Override
    public TableDataInfo<VideoTaskVo> queryPageList(VideoTaskBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<VideoTask> lqw = buildQueryWrapper(bo);
        Page<VideoTaskVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    @Override
    public List<VideoTaskVo> queryList(VideoTaskBo bo) {
        return baseMapper.selectVoList(buildQueryWrapper(bo));
    }

    @Override
    public Boolean insertByBo(VideoTaskBo bo) {
        VideoTask add = MapstructUtils.convert(bo, VideoTask.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    @Override
    public Boolean updateByBo(VideoTaskBo bo) {
        VideoTask update = MapstructUtils.convert(bo, VideoTask.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    @Override
    public Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid) {
        if (Boolean.TRUE.equals(isValid)) {
            List<VideoTask> list = baseMapper.selectByIds(ids);
            if (list.size() != ids.size()) {
                throw new ServiceException("您没有删除权限!");
            }
        }
        return baseMapper.deleteByIds(ids) > 0;
    }

    @Override
    public Boolean saveBatch(List<VideoTask> list) {
        return baseMapper.insertBatch(list);
    }

    private LambdaQueryWrapper<VideoTask> buildQueryWrapper(VideoTaskBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<VideoTask> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getId() != null, VideoTask::getId, bo.getId());
        lqw.eq(StringUtils.isNotBlank(bo.getTaskId()), VideoTask::getTaskId, bo.getTaskId());
        lqw.eq(StringUtils.isNotBlank(bo.getUserId()), VideoTask::getUserId, bo.getUserId());
        lqw.eq(StringUtils.isNotBlank(bo.getTaskType()), VideoTask::getTaskType, bo.getTaskType());
        lqw.eq(StringUtils.isNotBlank(bo.getTaskState()), VideoTask::getTaskState, bo.getTaskState());
        lqw.like(StringUtils.isNotBlank(bo.getSummary()), VideoTask::getSummary, bo.getSummary());
        lqw.like(StringUtils.isNotBlank(bo.getErrorSummary()), VideoTask::getErrorSummary, bo.getErrorSummary());
        lqw.like(StringUtils.isNotBlank(bo.getSourceSessionId()), VideoTask::getSourceSessionId, bo.getSourceSessionId());
        lqw.like(StringUtils.isNotBlank(bo.getSourceArtifactRef()), VideoTask::getSourceArtifactRef, bo.getSourceArtifactRef());
        lqw.like(StringUtils.isNotBlank(bo.getReplayHint()), VideoTask::getReplayHint, bo.getReplayHint());
        lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
            VideoTask::getCreateTime, params.get("beginCreateTime"), params.get("endCreateTime"));
        lqw.between(params.get("beginUpdateTime") != null && params.get("endUpdateTime") != null,
            VideoTask::getUpdateTime, params.get("beginUpdateTime"), params.get("endUpdateTime"));
        lqw.orderByDesc(VideoTask::getUpdateTime, VideoTask::getId);
        return lqw;
    }

    private void validEntityBeforeSave(VideoTask entity) {
        // 保留最小校验点，避免后续表结构扩展时直接散落在控制器里。
    }
}
