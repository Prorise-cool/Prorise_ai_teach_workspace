package org.dromara.xiaomai.service;

import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.xiaomai.domain.bo.XmModuleResourceBo;
import org.dromara.xiaomai.domain.vo.XmModuleBoundaryVo;
import org.dromara.xiaomai.domain.vo.XmModuleResourceVo;

import java.util.List;

/**
 * 小麦模块边界服务。
 *
 * @author Codex
 */
public interface IXmModuleBoundaryService {

    /**
     * 查询模块边界总览。
     */
    XmModuleBoundaryVo queryBoundary();

    /**
     * 查询资源规划列表。
     */
    List<XmModuleResourceVo> queryResourceList(XmModuleResourceBo bo);

    /**
     * 查询资源规划分页。
     */
    TableDataInfo<XmModuleResourceVo> queryResourcePage(XmModuleResourceBo bo, PageQuery pageQuery);
}
