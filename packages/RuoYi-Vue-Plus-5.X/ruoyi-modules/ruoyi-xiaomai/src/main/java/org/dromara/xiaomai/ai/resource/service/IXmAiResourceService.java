package org.dromara.xiaomai.ai.resource.service;

import org.dromara.xiaomai.ai.resource.domain.vo.XmAiResourceVo;
import org.dromara.xiaomai.ai.resource.domain.bo.XmAiResourceBo;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.core.page.PageQuery;

import java.util.Collection;
import java.util.List;

/**
 * AI 模型 / 音色等可调度资源Service接口
 *
 * @author Lion Li
 * @date 2026-04-07
 */
public interface IXmAiResourceService {

    /**
     * 查询AI 模型 / 音色等可调度资源
     *
     * @param id 主键
     * @return AI 模型 / 音色等可调度资源
     */
    XmAiResourceVo queryById(Long id);

    /**
     * 分页查询AI 模型 / 音色等可调度资源列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return AI 模型 / 音色等可调度资源分页列表
     */
    TableDataInfo<XmAiResourceVo> queryPageList(XmAiResourceBo bo, PageQuery pageQuery);

    /**
     * 查询符合条件的AI 模型 / 音色等可调度资源列表
     *
     * @param bo 查询条件
     * @return AI 模型 / 音色等可调度资源列表
     */
    List<XmAiResourceVo> queryList(XmAiResourceBo bo);

    /**
     * 新增AI 模型 / 音色等可调度资源
     *
     * @param bo AI 模型 / 音色等可调度资源
     * @return 是否新增成功
     */
    Boolean insertByBo(XmAiResourceBo bo);

    /**
     * 修改AI 模型 / 音色等可调度资源
     *
     * @param bo AI 模型 / 音色等可调度资源
     * @return 是否修改成功
     */
    Boolean updateByBo(XmAiResourceBo bo);

    /**
     * 校验并批量删除AI 模型 / 音色等可调度资源信息
     *
     * @param ids     待删除的主键集合
     * @param isValid 是否进行有效性校验
     * @return 是否删除成功
     */
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
