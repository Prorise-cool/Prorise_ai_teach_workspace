package org.dromara.xiaomai.user.profile.service.impl;

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
import org.dromara.xiaomai.user.profile.domain.bo.XmUserProfileBo;
import org.dromara.xiaomai.user.profile.domain.vo.XmUserProfileVo;
import org.dromara.xiaomai.user.profile.domain.XmUserProfile;
import org.dromara.xiaomai.user.profile.mapper.XmUserProfileMapper;
import org.dromara.xiaomai.user.profile.service.IXmUserProfileService;

import java.util.List;
import java.util.Map;
import java.util.Collection;

/**
 * 用户配置Service业务层处理
 *
 * @author Prorise
 * @date 2026-04-04
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class XmUserProfileServiceImpl implements IXmUserProfileService {

    private static final String DEFAULT_PROFILE_LANGUAGE = "zh-CN";

    private final XmUserProfileMapper baseMapper;

    /**
     * 查询用户配置
     *
     * @param id 主键
     * @return 用户配置
     */
    @Override
    public XmUserProfileVo queryById(Long id){
        return baseMapper.selectVoById(id);
    }

    /**
     * 分页查询用户配置列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 用户配置分页列表
     */
    @Override
    public TableDataInfo<XmUserProfileVo> queryPageList(XmUserProfileBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<XmUserProfile> lqw = buildQueryWrapper(bo);
        Page<XmUserProfileVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    /**
     * 查询符合条件的用户配置列表
     *
     * @param bo 查询条件
     * @return 用户配置列表
     */
    @Override
    public List<XmUserProfileVo> queryList(XmUserProfileBo bo) {
        LambdaQueryWrapper<XmUserProfile> lqw = buildQueryWrapper(bo);
        return baseMapper.selectVoList(lqw);
    }

    /**
     * 根据用户 ID 查询用户配置。
     *
     * @param userId 用户 ID
     * @return 用户配置
     */
    @Override
    public XmUserProfileVo queryByUserId(Long userId) {
        return baseMapper.selectVoOne(
            Wrappers.<XmUserProfile>lambdaQuery()
                .eq(XmUserProfile::getUserId, userId),
            false
        );
    }

    /**
     * 保存当前登录用户配置。
     *
     * @param userId 当前登录用户 ID
     * @param bo 用户配置
     * @return 保存后的用户配置
     */
    @Override
    public XmUserProfileVo saveCurrentProfile(Long userId, XmUserProfileBo bo) {
        XmUserProfile existingEntity = queryEntityByUserId(userId);

        bo.setUserId(userId);
        if (StringUtils.isBlank(bo.getLanguage())) {
            bo.setLanguage(DEFAULT_PROFILE_LANGUAGE);
        }

        if (existingEntity == null) {
            if (bo.getNotificationEnabled() == null) {
                bo.setNotificationEnabled(1L);
            }
            if (bo.getIsCompleted() == null) {
                bo.setIsCompleted(0L);
            }
            insertByBo(bo);
            return queryById(bo.getId());
        }

        bo.setId(existingEntity.getId());
        if (bo.getNotificationEnabled() == null) {
            bo.setNotificationEnabled(existingEntity.getNotificationEnabled() == null ? 1L : existingEntity.getNotificationEnabled());
        }
        if (bo.getIsCompleted() == null) {
            bo.setIsCompleted(existingEntity.getIsCompleted());
        }
        updateByBo(bo);
        return queryById(existingEntity.getId());
    }

    /**
     * 判断当前用户是否已完成配置。
     *
     * @param userId 当前登录用户 ID
     * @return 是否完成
     */
    @Override
    public Boolean isCompleted(Long userId) {
        XmUserProfileVo profile = queryByUserId(userId);

        return profile != null && Long.valueOf(1L).equals(profile.getIsCompleted());
    }

    private LambdaQueryWrapper<XmUserProfile> buildQueryWrapper(XmUserProfileBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<XmUserProfile> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getId() != null, XmUserProfile::getId, bo.getId());
        lqw.orderByAsc(XmUserProfile::getId);
        lqw.eq(bo.getUserId() != null, XmUserProfile::getUserId, bo.getUserId());
        lqw.apply(
            StringUtils.isNotBlank(bo.getUserName()),
            "user_id in (select user_id from sys_user where user_name like {0})",
            "%" + bo.getUserName().trim() + "%"
        );
        lqw.like(StringUtils.isNotBlank(bo.getBio()), XmUserProfile::getBio, bo.getBio());
        lqw.eq(StringUtils.isNotBlank(bo.getPersonalityType()), XmUserProfile::getPersonalityType, bo.getPersonalityType());
        lqw.eq(StringUtils.isNotBlank(bo.getLanguage()), XmUserProfile::getLanguage, bo.getLanguage());
        lqw.eq(bo.getIsCompleted() != null, XmUserProfile::getIsCompleted, bo.getIsCompleted());
        lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
            XmUserProfile::getCreateTime ,params.get("beginCreateTime"), params.get("endCreateTime"));
        lqw.between(params.get("beginUpdateTime") != null && params.get("endUpdateTime") != null,
            XmUserProfile::getUpdateTime ,params.get("beginUpdateTime"), params.get("endUpdateTime"));
        return lqw;
    }

    /**
     * 新增用户配置
     *
     * @param bo 用户配置
     * @return 是否新增成功
     */
    @Override
    public Boolean insertByBo(XmUserProfileBo bo) {
        XmUserProfile add = MapstructUtils.convert(bo, XmUserProfile.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    /**
     * 修改用户配置
     *
     * @param bo 用户配置
     * @return 是否修改成功
     */
    @Override
    public Boolean updateByBo(XmUserProfileBo bo) {
        XmUserProfile update = MapstructUtils.convert(bo, XmUserProfile.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    /**
     * 保存前的数据校验
     */
    private void validEntityBeforeSave(XmUserProfile entity){
        //TODO 做一些数据校验,如唯一约束
    }

    /**
     * 校验并批量删除用户配置信息
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

    private XmUserProfile queryEntityByUserId(Long userId) {
        return baseMapper.selectOne(
            Wrappers.<XmUserProfile>lambdaQuery()
                .eq(XmUserProfile::getUserId, userId)
                .last("limit 1")
        );
    }
}
