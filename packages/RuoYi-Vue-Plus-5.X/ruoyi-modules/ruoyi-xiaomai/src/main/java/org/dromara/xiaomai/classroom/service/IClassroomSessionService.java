package org.dromara.xiaomai.classroom.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.classroom.domain.ClassroomSession;
import org.dromara.xiaomai.classroom.domain.bo.ClassroomSessionBo;
import org.dromara.xiaomai.classroom.domain.vo.ClassroomSessionVo;

import java.util.Collection;
import java.util.List;

/**
 * 课堂会话服务接口。
 *
 * @author Codex
 */
public interface IClassroomSessionService {

    ClassroomSessionVo queryById(Long id);

    TableDataInfo<ClassroomSessionVo> queryPageList(ClassroomSessionBo bo, PageQuery pageQuery);

    List<ClassroomSessionVo> queryList(ClassroomSessionBo bo);

    Boolean insertByBo(ClassroomSessionBo bo);

    Boolean updateByBo(ClassroomSessionBo bo);

    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);

    Boolean saveBatch(List<ClassroomSession> list);
}
