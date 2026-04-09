package org.dromara.xiaomai.ai.provider.service.impl;

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
import org.dromara.xiaomai.ai.provider.domain.bo.XmAiProviderBo;
import org.dromara.xiaomai.ai.provider.domain.vo.XmAiProviderVo;
import org.dromara.xiaomai.ai.provider.domain.XmAiProvider;
import org.dromara.xiaomai.ai.provider.mapper.XmAiProviderMapper;
import org.dromara.xiaomai.ai.provider.service.IXmAiProviderService;

import java.util.List;
import java.util.Collection;

/**
 * AI Provider 实例配置Service业务层处理
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class XmAiProviderServiceImpl implements IXmAiProviderService {

    private final XmAiProviderMapper baseMapper;

    /**
     * 查询AI Provider 实例配置
     *
     * @param id 主键
     * @return AI Provider 实例配置
     */
    @Override
    public XmAiProviderVo queryById(Long id){
        return maskSensitiveFields(baseMapper.selectVoById(id));
    }

    /**
     * 分页查询AI Provider 实例配置列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return AI Provider 实例配置分页列表
     */
    @Override
    public TableDataInfo<XmAiProviderVo> queryPageList(XmAiProviderBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<XmAiProvider> lqw = buildQueryWrapper(bo);
        Page<XmAiProviderVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        result.setRecords(maskSensitiveFields(result.getRecords()));
        return TableDataInfo.build(result);
    }

    /**
     * 查询符合条件的AI Provider 实例配置列表
     *
     * @param bo 查询条件
     * @return AI Provider 实例配置列表
     */
    @Override
    public List<XmAiProviderVo> queryList(XmAiProviderBo bo) {
        LambdaQueryWrapper<XmAiProvider> lqw = buildQueryWrapper(bo);
        return maskSensitiveFields(baseMapper.selectVoList(lqw));
    }

    private LambdaQueryWrapper<XmAiProvider> buildQueryWrapper(XmAiProviderBo bo) {
        LambdaQueryWrapper<XmAiProvider> lqw = Wrappers.lambdaQuery();
        lqw.orderByAsc(XmAiProvider::getId);
        lqw.eq(StringUtils.isNotBlank(bo.getProviderCode()), XmAiProvider::getProviderCode, bo.getProviderCode());
        lqw.like(StringUtils.isNotBlank(bo.getProviderName()), XmAiProvider::getProviderName, bo.getProviderName());
        lqw.eq(StringUtils.isNotBlank(bo.getVendorCode()), XmAiProvider::getVendorCode, bo.getVendorCode());
        lqw.eq(StringUtils.isNotBlank(bo.getAuthType()), XmAiProvider::getAuthType, bo.getAuthType());
        lqw.eq(StringUtils.isNotBlank(bo.getEndpointUrl()), XmAiProvider::getEndpointUrl, bo.getEndpointUrl());
        lqw.eq(StringUtils.isNotBlank(bo.getAppId()), XmAiProvider::getAppId, bo.getAppId());
        lqw.eq(StringUtils.isNotBlank(bo.getExtraAuthJson()), XmAiProvider::getExtraAuthJson, bo.getExtraAuthJson());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), XmAiProvider::getStatus, bo.getStatus());
        lqw.eq(bo.getSortOrder() != null, XmAiProvider::getSortOrder, bo.getSortOrder());
        return lqw;
    }

    /**
     * 新增AI Provider 实例配置
     *
     * @param bo AI Provider 实例配置
     * @return 是否新增成功
     */
    @Override
    public Boolean insertByBo(XmAiProviderBo bo) {
        XmAiProvider add = buildEntityFromBo(bo);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    /**
     * 修改AI Provider 实例配置
     *
     * @param bo AI Provider 实例配置
     * @return 是否修改成功
     */
    @Override
    public Boolean updateByBo(XmAiProviderBo bo) {
        XmAiProvider current = baseMapper.selectById(bo.getId());
        if (current == null) {
            return false;
        }
        XmAiProvider update = buildEntityFromBo(bo);
        keepStoredSecretsWhenBlank(update, current);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    /**
     * 保存前的数据校验
     */
    private void validEntityBeforeSave(XmAiProvider entity){
        //TODO 做一些数据校验,如唯一约束
    }

    /**
     * 校验并批量删除AI Provider 实例配置信息
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

    private List<XmAiProviderVo> maskSensitiveFields(List<XmAiProviderVo> records) {
        if (records == null || records.isEmpty()) {
            return records;
        }
        records.forEach(this::maskSensitiveFields);
        return records;
    }

    private XmAiProviderVo maskSensitiveFields(XmAiProviderVo vo) {
        if (vo == null) {
            return null;
        }
        vo.setApiKey(maskSecret(vo.getApiKey()));
        vo.setApiSecret(maskSecret(vo.getApiSecret()));
        vo.setAccessToken(maskSecret(vo.getAccessToken()));
        return vo;
    }

    private void keepStoredSecretsWhenBlank(XmAiProvider update, XmAiProvider current) {
        if (StringUtils.isBlank(update.getApiKey())) {
            update.setApiKey(current.getApiKey());
        }
        if (StringUtils.isBlank(update.getApiSecret())) {
            update.setApiSecret(current.getApiSecret());
        }
        if (StringUtils.isBlank(update.getAccessToken())) {
            update.setAccessToken(current.getAccessToken());
        }
    }

    private XmAiProvider buildEntityFromBo(XmAiProviderBo bo) {
        return MapstructUtils.convert(bo, XmAiProvider.class);
    }

    private String maskSecret(String value) {
        if (StringUtils.isBlank(value)) {
            return value;
        }
        if (value.length() == 1) {
            return "*";
        }
        int visible = value.length() <= 4 ? 1 : 4;
        return "*".repeat(value.length() - visible) + value.substring(value.length() - visible);
    }
}
