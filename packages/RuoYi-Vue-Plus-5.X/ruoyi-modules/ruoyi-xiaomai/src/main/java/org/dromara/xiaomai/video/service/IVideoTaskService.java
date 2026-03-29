package org.dromara.xiaomai.video.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.video.domain.VideoTask;
import org.dromara.xiaomai.video.domain.bo.VideoTaskBo;
import org.dromara.xiaomai.video.domain.vo.VideoTaskVo;

import java.util.Collection;
import java.util.List;

/**
 * 视频任务服务接口。
 *
 * @author Codex
 */
public interface IVideoTaskService {

    VideoTaskVo queryById(Long id);

    TableDataInfo<VideoTaskVo> queryPageList(VideoTaskBo bo, PageQuery pageQuery);

    List<VideoTaskVo> queryList(VideoTaskBo bo);

    Boolean insertByBo(VideoTaskBo bo);

    Boolean updateByBo(VideoTaskBo bo);

    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);

    Boolean saveBatch(List<VideoTask> list);
}
