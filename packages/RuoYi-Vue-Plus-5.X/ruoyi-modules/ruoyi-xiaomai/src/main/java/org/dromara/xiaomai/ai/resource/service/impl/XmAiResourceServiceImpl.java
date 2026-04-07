package org.dromara.xiaomai.ai.resource.service.impl;

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
import org.dromara.xiaomai.ai.resource.domain.bo.XmAiResourceBo;
import org.dromara.xiaomai.ai.resource.domain.vo.XmAiResourceVo;
import org.dromara.xiaomai.ai.resource.domain.XmAiResource;
import org.dromara.xiaomai.ai.resource.mapper.XmAiResourceMapper;
import org.dromara.xiaomai.ai.resource.service.IXmAiResourceService;

import java.util.List;
import java.util.Map;
import java.util.Collection;

/**
 * AI 模型 / 音色等可调度资源Service业务层处理
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class XmAiResourceServiceImpl implements IXmAiResourceService {

    private final XmAiResourceMapper baseMapper;

    /**
     * 查询AI 模型 / 音色等可调度资源
     *
     * @param id 主键
     * @return AI 模型 / 音色等可调度资源
     */
    @Override
    public XmAiResourceVo queryById(Long id){
        return baseMapper.selectVoById(id);
    }

    /**
     * 分页查询AI 模型 / 音色等可调度资源列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return AI 模型 / 音色等可调度资源分页列表
     */
    @Override
    public TableDataInfo<XmAiResourceVo> queryPageList(XmAiResourceBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<XmAiResource> lqw = buildQueryWrapper(bo);
        Page<XmAiResourceVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    /**
     * 查询符合条件的AI 模型 / 音色等可调度资源列表
     *
     * @param bo 查询条件
     * @return AI 模型 / 音色等可调度资源列表
     */
    @Override
    public List<XmAiResourceVo> queryList(XmAiResourceBo bo) {
        LambdaQueryWrapper<XmAiResource> lqw = buildQueryWrapper(bo);
        return baseMapper.selectVoList(lqw);
    }

    private LambdaQueryWrapper<XmAiResource> buildQueryWrapper(XmAiResourceBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<XmAiResource> lqw = Wrappers.lambdaQuery();
        lqw.orderByAsc(XmAiResource::getId);
        lqw.eq(bo.getProviderId() != null, XmAiResource::getProviderId, bo.getProviderId());
        lqw.eq(StringUtils.isNotBlank(bo.getCapability()), XmAiResource::getCapability, bo.getCapability());
        lqw.eq(StringUtils.isNotBlank(bo.getResourceCode()), XmAiResource::getResourceCode, bo.getResourceCode());
        lqw.like(StringUtils.isNotBlank(bo.getResourceName()), XmAiResource::getResourceName, bo.getResourceName());
        lqw.eq(StringUtils.isNotBlank(bo.getResourceType()), XmAiResource::getResourceType, bo.getResourceType());
        lqw.eq(StringUtils.isNotBlank(bo.getRuntimeProviderId()), XmAiResource::getRuntimeProviderId, bo.getRuntimeProviderId());
        lqw.like(StringUtils.isNotBlank(bo.getModelName()), XmAiResource::getModelName, bo.getModelName());
        lqw.eq(StringUtils.isNotBlank(bo.getVoiceCode()), XmAiResource::getVoiceCode, bo.getVoiceCode());
        lqw.eq(StringUtils.isNotBlank(bo.getLanguageCode()), XmAiResource::getLanguageCode, bo.getLanguageCode());
        lqw.eq(StringUtils.isNotBlank(bo.getResourceSettingsJson()), XmAiResource::getResourceSettingsJson, bo.getResourceSettingsJson());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), XmAiResource::getStatus, bo.getStatus());
        lqw.eq(bo.getSortOrder() != null, XmAiResource::getSortOrder, bo.getSortOrder());
        return lqw;
    }

    /**
     * 新增AI 模型 / 音色等可调度资源
     *
     * @param bo AI 模型 / 音色等可调度资源
     * @return 是否新增成功
     */
    @Override
    public Boolean insertByBo(XmAiResourceBo bo) {
        XmAiResource add = MapstructUtils.convert(bo, XmAiResource.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    /**
     * 修改AI 模型 / 音色等可调度资源
     *
     * @param bo AI 模型 / 音色等可调度资源
     * @return 是否修改成功
     */
    @Override
    public Boolean updateByBo(XmAiResourceBo bo) {
        XmAiResource update = MapstructUtils.convert(bo, XmAiResource.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    /**
     * 保存前的数据校验
     */
    private void validEntityBeforeSave(XmAiResource entity){
        //TODO 做一些数据校验,如唯一约束
    }

    /**
     * 校验并批量删除AI 模型 / 音色等可调度资源信息
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
