package org.dromara.xiaomai.landing.service.impl;

import org.dromara.common.core.utils.MapstructUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.core.page.PageQuery;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.dromara.xiaomai.landing.domain.bo.XmLandingLeadBo;
import org.dromara.xiaomai.landing.domain.vo.XmLandingLeadVo;
import org.dromara.xiaomai.landing.domain.XmLandingLead;
import org.dromara.xiaomai.landing.mapper.XmLandingLeadMapper;
import org.dromara.xiaomai.landing.service.IXmLandingLeadService;

import java.util.List;
import java.util.Map;
import java.util.Collection;

/**
 * 营销落地页线索Service业务层处理
 *
 * @author Prorise
 * @date 2026-04-05
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class XmLandingLeadServiceImpl implements IXmLandingLeadService {

    private final XmLandingLeadMapper baseMapper;

    /**
     * 查询营销落地页线索
     *
     * @param id 主键
     * @return 营销落地页线索
     */
    @Override
    public XmLandingLeadVo queryById(Long id){
        return baseMapper.selectVoById(id);
    }

    /**
     * 分页查询营销落地页线索列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 营销落地页线索分页列表
     */
    @Override
    public TableDataInfo<XmLandingLeadVo> queryPageList(XmLandingLeadBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<XmLandingLead> lqw = buildQueryWrapper(bo);
        Page<XmLandingLeadVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    /**
     * 查询符合条件的营销落地页线索列表
     *
     * @param bo 查询条件
     * @return 营销落地页线索列表
     */
    @Override
    public List<XmLandingLeadVo> queryList(XmLandingLeadBo bo) {
        LambdaQueryWrapper<XmLandingLead> lqw = buildQueryWrapper(bo);
        return baseMapper.selectVoList(lqw);
    }

    private LambdaQueryWrapper<XmLandingLead> buildQueryWrapper(XmLandingLeadBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<XmLandingLead> lqw = Wrappers.lambdaQuery();
        lqw.orderByDesc(XmLandingLead::getCreateTime, XmLandingLead::getId);
        lqw.like(StringUtils.isNotBlank(bo.getContactName()), XmLandingLead::getContactName, bo.getContactName());
        lqw.like(StringUtils.isNotBlank(bo.getOrganizationName()), XmLandingLead::getOrganizationName, bo.getOrganizationName());
        lqw.eq(StringUtils.isNotBlank(bo.getContactEmail()), XmLandingLead::getContactEmail, bo.getContactEmail());
        lqw.eq(StringUtils.isNotBlank(bo.getSubject()), XmLandingLead::getSubject, bo.getSubject());
        lqw.eq(StringUtils.isNotBlank(bo.getSourcePage()), XmLandingLead::getSourcePage, bo.getSourcePage());
        lqw.eq(StringUtils.isNotBlank(bo.getSourceLocale()), XmLandingLead::getSourceLocale, bo.getSourceLocale());
        lqw.eq(StringUtils.isNotBlank(bo.getProcessingStatus()), XmLandingLead::getProcessingStatus, bo.getProcessingStatus());
        lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
            XmLandingLead::getCreateTime ,params.get("beginCreateTime"), params.get("endCreateTime"));
        return lqw;
    }

    /**
     * 新增营销落地页线索
     *
     * @param bo 营销落地页线索
     * @return 是否新增成功
     */
    @Override
    public Boolean insertByBo(XmLandingLeadBo bo) {
        XmLandingLead add = MapstructUtils.convert(bo, XmLandingLead.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    /**
     * 修改营销落地页线索
     *
     * @param bo 营销落地页线索
     * @return 是否修改成功
     */
    @Override
    public Boolean updateByBo(XmLandingLeadBo bo) {
        XmLandingLead update = MapstructUtils.convert(bo, XmLandingLead.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    /**
     * 保存前的数据校验
     */
    private void validEntityBeforeSave(XmLandingLead entity){
        //TODO 做一些数据校验,如唯一约束
    }

    /**
     * 校验并批量删除营销落地页线索信息
     *
     * @param ids     待删除的主键集合
     * @param isValid 是否进行有效性校验
     * @return 是否删除成功
     */
    @Override
    public Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid) {
        if(isValid){
            //TODO 做一些业务上的校验,判断是否需要校验
        }
        return baseMapper.deleteByIds(ids) > 0;
    }
}
