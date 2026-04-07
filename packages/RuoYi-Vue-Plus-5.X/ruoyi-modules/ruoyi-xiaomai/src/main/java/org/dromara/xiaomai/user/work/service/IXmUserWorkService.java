package org.dromara.xiaomai.user.work.service;

import org.dromara.xiaomai.user.work.domain.vo.XmUserWorkVo;
import org.dromara.xiaomai.user.work.domain.bo.XmUserWorkBo;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.mybatis.core.page.PageQuery;

import java.util.Collection;
import java.util.List;

/**
 * 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用Service接口
 *
 * @author Lion Li
 * @date 2026-04-07
 */
public interface IXmUserWorkService {

    /**
     * 查询用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     *
     * @param id 主键
     * @return 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     */
    XmUserWorkVo queryById(Long id);

    /**
     * 分页查询用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用分页列表
     */
    TableDataInfo<XmUserWorkVo> queryPageList(XmUserWorkBo bo, PageQuery pageQuery);

    /**
     * 查询符合条件的用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     *
     * @param bo 查询条件
     * @return 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     */
    List<XmUserWorkVo> queryList(XmUserWorkBo bo);

    /**
     * 新增用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     *
     * @param bo 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     * @return 是否新增成功
     */
    Boolean insertByBo(XmUserWorkBo bo);

    /**
     * 修改用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     *
     * @param bo 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     * @return 是否修改成功
     */
    Boolean updateByBo(XmUserWorkBo bo);

    /**
     * 校验并批量删除用户作品（视频/课堂）—— 社区瀑布流与管理后台共用信息
     *
     * @param ids     待删除的主键集合
     * @param isValid 是否进行有效性校验
     * @return 是否删除成功
     */
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
