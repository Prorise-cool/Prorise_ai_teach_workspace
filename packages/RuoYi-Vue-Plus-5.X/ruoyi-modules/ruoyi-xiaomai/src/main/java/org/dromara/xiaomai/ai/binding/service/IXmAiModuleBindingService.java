package org.dromara.xiaomai.ai.binding.service;

import org.dromara.xiaomai.ai.binding.domain.vo.XmAiModuleBindingVo;
import org.dromara.xiaomai.ai.binding.domain.bo.XmAiModuleBindingBo;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.core.page.PageQuery;

import java.util.Collection;
import java.util.List;

/**
 * 模块阶段到运行资源的绑定关系Service接口
 *
 * @author Lion Li
 * @date 2026-04-07
 */
public interface IXmAiModuleBindingService {

    /**
     * 查询模块阶段到运行资源的绑定关系
     *
     * @param id 主键
     * @return 模块阶段到运行资源的绑定关系
     */
    XmAiModuleBindingVo queryById(Long id);

    /**
     * 分页查询模块阶段到运行资源的绑定关系列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 模块阶段到运行资源的绑定关系分页列表
     */
    TableDataInfo<XmAiModuleBindingVo> queryPageList(XmAiModuleBindingBo bo, PageQuery pageQuery);

    /**
     * 查询符合条件的模块阶段到运行资源的绑定关系列表
     *
     * @param bo 查询条件
     * @return 模块阶段到运行资源的绑定关系列表
     */
    List<XmAiModuleBindingVo> queryList(XmAiModuleBindingBo bo);

    /**
     * 新增模块阶段到运行资源的绑定关系
     *
     * @param bo 模块阶段到运行资源的绑定关系
     * @return 是否新增成功
     */
    Boolean insertByBo(XmAiModuleBindingBo bo);

    /**
     * 修改模块阶段到运行资源的绑定关系
     *
     * @param bo 模块阶段到运行资源的绑定关系
     * @return 是否修改成功
     */
    Boolean updateByBo(XmAiModuleBindingBo bo);

    /**
     * 校验并批量删除模块阶段到运行资源的绑定关系信息
     *
     * @param ids     待删除的主键集合
     * @param isValid 是否进行有效性校验
     * @return 是否删除成功
     */
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
