package org.dromara.xiaomai.user.profile.service;

import org.dromara.xiaomai.user.profile.domain.vo.XmUserProfileVo;
import org.dromara.xiaomai.user.profile.domain.bo.XmUserProfileBo;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.core.page.PageQuery;

import java.util.Collection;
import java.util.List;

/**
 * 用户配置Service接口
 *
 * @author Prorise
 * @date 2026-04-04
 */
public interface IXmUserProfileService {

    /**
     * 查询用户配置
     *
     * @param id 主键
     * @return 用户配置
     */
    XmUserProfileVo queryById(Long id);

    /**
     * 分页查询用户配置列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 用户配置分页列表
     */
    TableDataInfo<XmUserProfileVo> queryPageList(XmUserProfileBo bo, PageQuery pageQuery);

    /**
     * 查询符合条件的用户配置列表
     *
     * @param bo 查询条件
     * @return 用户配置列表
     */
    List<XmUserProfileVo> queryList(XmUserProfileBo bo);

    /**
     * 新增用户配置
     *
     * @param bo 用户配置
     * @return 是否新增成功
     */
    Boolean insertByBo(XmUserProfileBo bo);

    /**
     * 修改用户配置
     *
     * @param bo 用户配置
     * @return 是否修改成功
     */
    Boolean updateByBo(XmUserProfileBo bo);

    /**
     * 校验并批量删除用户配置信息
     *
     * @param ids     待删除的主键集合
     * @param isValid 是否进行有效性校验
     * @return 是否删除成功
     */
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
