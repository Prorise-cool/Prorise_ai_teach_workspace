package org.dromara.xiaomai.ai.provider.service;

import org.dromara.xiaomai.ai.provider.domain.vo.XmAiProviderVo;
import org.dromara.xiaomai.ai.provider.domain.bo.XmAiProviderBo;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.core.page.PageQuery;

import java.util.Collection;
import java.util.List;

/**
 * AI Provider 实例配置Service接口
 *
 * @author Lion Li
 * @date 2026-04-07
 */
public interface IXmAiProviderService {

    /**
     * 查询AI Provider 实例配置
     *
     * @param id 主键
     * @return AI Provider 实例配置
     */
    XmAiProviderVo queryById(Long id);

    /**
     * 分页查询AI Provider 实例配置列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return AI Provider 实例配置分页列表
     */
    TableDataInfo<XmAiProviderVo> queryPageList(XmAiProviderBo bo, PageQuery pageQuery);

    /**
     * 查询符合条件的AI Provider 实例配置列表
     *
     * @param bo 查询条件
     * @return AI Provider 实例配置列表
     */
    List<XmAiProviderVo> queryList(XmAiProviderBo bo);

    /**
     * 新增AI Provider 实例配置
     *
     * @param bo AI Provider 实例配置
     * @return 是否新增成功
     */
    Boolean insertByBo(XmAiProviderBo bo);

    /**
     * 修改AI Provider 实例配置
     *
     * @param bo AI Provider 实例配置
     * @return 是否修改成功
     */
    Boolean updateByBo(XmAiProviderBo bo);

    /**
     * 校验并批量删除AI Provider 实例配置信息
     *
     * @param ids     待删除的主键集合
     * @param isValid 是否进行有效性校验
     * @return 是否删除成功
     */
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
