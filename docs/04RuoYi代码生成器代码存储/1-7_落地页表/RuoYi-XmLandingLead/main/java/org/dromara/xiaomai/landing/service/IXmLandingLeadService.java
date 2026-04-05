package org.dromara.xiaomai.landing.service;

import org.dromara.xiaomai.landing.domain.vo.XmLandingLeadVo;
import org.dromara.xiaomai.landing.domain.bo.XmLandingLeadBo;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.core.page.PageQuery;

import java.util.Collection;
import java.util.List;

/**
 * 营销落地页线索Service接口
 *
 * @author Prorise
 * @date 2026-04-05
 */
public interface IXmLandingLeadService {

    /**
     * 查询营销落地页线索
     *
     * @param id 主键
     * @return 营销落地页线索
     */
    XmLandingLeadVo queryById(Long id);

    /**
     * 分页查询营销落地页线索列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 营销落地页线索分页列表
     */
    TableDataInfo<XmLandingLeadVo> queryPageList(XmLandingLeadBo bo, PageQuery pageQuery);

    /**
     * 查询符合条件的营销落地页线索列表
     *
     * @param bo 查询条件
     * @return 营销落地页线索列表
     */
    List<XmLandingLeadVo> queryList(XmLandingLeadBo bo);

    /**
     * 新增营销落地页线索
     *
     * @param bo 营销落地页线索
     * @return 是否新增成功
     */
    Boolean insertByBo(XmLandingLeadBo bo);

    /**
     * 修改营销落地页线索
     *
     * @param bo 营销落地页线索
     * @return 是否修改成功
     */
    Boolean updateByBo(XmLandingLeadBo bo);

    /**
     * 校验并批量删除营销落地页线索信息
     *
     * @param ids     待删除的主键集合
     * @param isValid 是否进行有效性校验
     * @return 是否删除成功
     */
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
