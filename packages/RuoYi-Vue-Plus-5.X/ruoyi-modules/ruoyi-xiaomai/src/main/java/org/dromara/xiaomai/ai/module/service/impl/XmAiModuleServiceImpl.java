package org.dromara.xiaomai.ai.module.service.impl;

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
import org.dromara.xiaomai.ai.module.domain.bo.XmAiModuleBo;
import org.dromara.xiaomai.ai.module.domain.vo.XmAiModuleVo;
import org.dromara.xiaomai.ai.module.domain.XmAiModule;
import org.dromara.xiaomai.ai.module.mapper.XmAiModuleMapper;
import org.dromara.xiaomai.ai.module.service.IXmAiModuleService;

import java.util.List;
import java.util.Map;
import java.util.Collection;

/**
 * AI 配置模块主数据Service业务层处理
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class XmAiModuleServiceImpl implements IXmAiModuleService {

    private final XmAiModuleMapper baseMapper;

    /**
     * 查询AI 配置模块主数据
     *
     * @param id 主键
     * @return AI 配置模块主数据
     */
    @Override
    public XmAiModuleVo queryById(Long id){
        return baseMapper.selectVoById(id);
    }

    /**
     * 分页查询AI 配置模块主数据列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return AI 配置模块主数据分页列表
     */
    @Override
    public TableDataInfo<XmAiModuleVo> queryPageList(XmAiModuleBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<XmAiModule> lqw = buildQueryWrapper(bo);
        Page<XmAiModuleVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    /**
     * 查询符合条件的AI 配置模块主数据列表
     *
     * @param bo 查询条件
     * @return AI 配置模块主数据列表
     */
    @Override
    public List<XmAiModuleVo> queryList(XmAiModuleBo bo) {
        LambdaQueryWrapper<XmAiModule> lqw = buildQueryWrapper(bo);
        return baseMapper.selectVoList(lqw);
    }

    private LambdaQueryWrapper<XmAiModule> buildQueryWrapper(XmAiModuleBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<XmAiModule> lqw = Wrappers.lambdaQuery();
        lqw.orderByAsc(XmAiModule::getId);
        lqw.eq(StringUtils.isNotBlank(bo.getModuleCode()), XmAiModule::getModuleCode, bo.getModuleCode());
        lqw.like(StringUtils.isNotBlank(bo.getModuleName()), XmAiModule::getModuleName, bo.getModuleName());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), XmAiModule::getStatus, bo.getStatus());
        lqw.eq(bo.getSortOrder() != null, XmAiModule::getSortOrder, bo.getSortOrder());
        return lqw;
    }

    /**
     * 新增AI 配置模块主数据
     *
     * @param bo AI 配置模块主数据
     * @return 是否新增成功
     */
    @Override
    public Boolean insertByBo(XmAiModuleBo bo) {
        XmAiModule add = MapstructUtils.convert(bo, XmAiModule.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    /**
     * 修改AI 配置模块主数据
     *
     * @param bo AI 配置模块主数据
     * @return 是否修改成功
     */
    @Override
    public Boolean updateByBo(XmAiModuleBo bo) {
        XmAiModule update = MapstructUtils.convert(bo, XmAiModule.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    /**
     * 保存前的数据校验
     */
    private void validEntityBeforeSave(XmAiModule entity){
        //TODO 做一些数据校验,如唯一约束
    }

    /**
     * 校验并批量删除AI 配置模块主数据信息
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
