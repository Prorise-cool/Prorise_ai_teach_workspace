package org.dromara.xiaomai.ai.binding.service.impl;

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
import org.dromara.xiaomai.ai.binding.domain.bo.XmAiModuleBindingBo;
import org.dromara.xiaomai.ai.binding.domain.vo.XmAiModuleBindingVo;
import org.dromara.xiaomai.ai.binding.domain.XmAiModuleBinding;
import org.dromara.xiaomai.ai.binding.mapper.XmAiModuleBindingMapper;
import org.dromara.xiaomai.ai.binding.service.IXmAiModuleBindingService;

import java.util.List;
import java.util.Map;
import java.util.Collection;

/**
 * 模块阶段到运行资源的绑定关系Service业务层处理
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class XmAiModuleBindingServiceImpl implements IXmAiModuleBindingService {

    private final XmAiModuleBindingMapper baseMapper;

    /**
     * 查询模块阶段到运行资源的绑定关系
     *
     * @param id 主键
     * @return 模块阶段到运行资源的绑定关系
     */
    @Override
    public XmAiModuleBindingVo queryById(Long id){
        return baseMapper.selectVoById(id);
    }

    /**
     * 分页查询模块阶段到运行资源的绑定关系列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 模块阶段到运行资源的绑定关系分页列表
     */
    @Override
    public TableDataInfo<XmAiModuleBindingVo> queryPageList(XmAiModuleBindingBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<XmAiModuleBinding> lqw = buildQueryWrapper(bo);
        Page<XmAiModuleBindingVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    /**
     * 查询符合条件的模块阶段到运行资源的绑定关系列表
     *
     * @param bo 查询条件
     * @return 模块阶段到运行资源的绑定关系列表
     */
    @Override
    public List<XmAiModuleBindingVo> queryList(XmAiModuleBindingBo bo) {
        LambdaQueryWrapper<XmAiModuleBinding> lqw = buildQueryWrapper(bo);
        return baseMapper.selectVoList(lqw);
    }

    private LambdaQueryWrapper<XmAiModuleBinding> buildQueryWrapper(XmAiModuleBindingBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<XmAiModuleBinding> lqw = Wrappers.lambdaQuery();
        lqw.orderByAsc(XmAiModuleBinding::getId);
        lqw.eq(bo.getModuleId() != null, XmAiModuleBinding::getModuleId, bo.getModuleId());
        lqw.eq(StringUtils.isNotBlank(bo.getStageCode()), XmAiModuleBinding::getStageCode, bo.getStageCode());
        lqw.eq(StringUtils.isNotBlank(bo.getCapability()), XmAiModuleBinding::getCapability, bo.getCapability());
        lqw.eq(StringUtils.isNotBlank(bo.getRoleCode()), XmAiModuleBinding::getRoleCode, bo.getRoleCode());
        lqw.eq(bo.getResourceId() != null, XmAiModuleBinding::getResourceId, bo.getResourceId());
        lqw.eq(bo.getPriority() != null, XmAiModuleBinding::getPriority, bo.getPriority());
        lqw.eq(bo.getTimeoutSeconds() != null, XmAiModuleBinding::getTimeoutSeconds, bo.getTimeoutSeconds());
        lqw.eq(bo.getRetryAttempts() != null, XmAiModuleBinding::getRetryAttempts, bo.getRetryAttempts());
        lqw.eq(StringUtils.isNotBlank(bo.getHealthSource()), XmAiModuleBinding::getHealthSource, bo.getHealthSource());
        lqw.eq(StringUtils.isNotBlank(bo.getRuntimeSettingsJson()), XmAiModuleBinding::getRuntimeSettingsJson, bo.getRuntimeSettingsJson());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), XmAiModuleBinding::getStatus, bo.getStatus());
        lqw.eq(StringUtils.isNotBlank(bo.getIsDefault()), XmAiModuleBinding::getIsDefault, bo.getIsDefault());
        return lqw;
    }

    /**
     * 新增模块阶段到运行资源的绑定关系
     *
     * @param bo 模块阶段到运行资源的绑定关系
     * @return 是否新增成功
     */
    @Override
    public Boolean insertByBo(XmAiModuleBindingBo bo) {
        XmAiModuleBinding add = MapstructUtils.convert(bo, XmAiModuleBinding.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    /**
     * 修改模块阶段到运行资源的绑定关系
     *
     * @param bo 模块阶段到运行资源的绑定关系
     * @return 是否修改成功
     */
    @Override
    public Boolean updateByBo(XmAiModuleBindingBo bo) {
        XmAiModuleBinding update = MapstructUtils.convert(bo, XmAiModuleBinding.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    /**
     * 保存前的数据校验
     */
    private void validEntityBeforeSave(XmAiModuleBinding entity){
        //TODO 做一些数据校验,如唯一约束
    }

    /**
     * 校验并批量删除模块阶段到运行资源的绑定关系信息
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
