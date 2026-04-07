package org.dromara.xiaomai.user.work.service.impl;

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
import org.dromara.xiaomai.user.work.domain.bo.XmUserWorkBo;
import org.dromara.xiaomai.user.work.domain.vo.XmUserWorkVo;
import org.dromara.xiaomai.user.work.domain.XmUserWork;
import org.dromara.xiaomai.user.work.mapper.XmUserWorkMapper;
import org.dromara.xiaomai.user.work.service.IXmUserWorkService;

import java.util.List;
import java.util.Map;
import java.util.Collection;

/**
 * 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用Service业务层处理
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class XmUserWorkServiceImpl implements IXmUserWorkService {

    private final XmUserWorkMapper baseMapper;

    /**
     * 查询用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     *
     * @param id 主键
     * @return 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     */
    @Override
    public XmUserWorkVo queryById(Long id){
        return baseMapper.selectVoById(id);
    }

    /**
     * 分页查询用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     *
     * @param bo        查询条件
     * @param pageQuery 分页参数
     * @return 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用分页列表
     */
    @Override
    public TableDataInfo<XmUserWorkVo> queryPageList(XmUserWorkBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<XmUserWork> lqw = buildQueryWrapper(bo);
        Page<XmUserWorkVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    /**
     * 查询符合条件的用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     *
     * @param bo 查询条件
     * @return 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用列表
     */
    @Override
    public List<XmUserWorkVo> queryList(XmUserWorkBo bo) {
        LambdaQueryWrapper<XmUserWork> lqw = buildQueryWrapper(bo);
        return baseMapper.selectVoList(lqw);
    }

    private LambdaQueryWrapper<XmUserWork> buildQueryWrapper(XmUserWorkBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<XmUserWork> lqw = Wrappers.lambdaQuery();
        lqw.orderByAsc(XmUserWork::getId);
        lqw.eq(bo.getUserId() != null, XmUserWork::getUserId, bo.getUserId());
        lqw.eq(StringUtils.isNotBlank(bo.getWorkType()), XmUserWork::getWorkType, bo.getWorkType());
        lqw.eq(StringUtils.isNotBlank(bo.getTaskRefId()), XmUserWork::getTaskRefId, bo.getTaskRefId());
        lqw.eq(StringUtils.isNotBlank(bo.getTitle()), XmUserWork::getTitle, bo.getTitle());
        lqw.eq(StringUtils.isNotBlank(bo.getDescription()), XmUserWork::getDescription, bo.getDescription());
        lqw.eq(bo.getCoverOssId() != null, XmUserWork::getCoverOssId, bo.getCoverOssId());
        lqw.eq(StringUtils.isNotBlank(bo.getCoverUrl()), XmUserWork::getCoverUrl, bo.getCoverUrl());
        lqw.eq(bo.getIsPublic() != null, XmUserWork::getIsPublic, bo.getIsPublic());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), XmUserWork::getStatus, bo.getStatus());
        lqw.eq(bo.getViewCount() != null, XmUserWork::getViewCount, bo.getViewCount());
        lqw.eq(bo.getLikeCount() != null, XmUserWork::getLikeCount, bo.getLikeCount());
        return lqw;
    }

    /**
     * 新增用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     *
     * @param bo 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     * @return 是否新增成功
     */
    @Override
    public Boolean insertByBo(XmUserWorkBo bo) {
        XmUserWork add = MapstructUtils.convert(bo, XmUserWork.class);
        validEntityBeforeSave(add);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    /**
     * 修改用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     *
     * @param bo 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用
     * @return 是否修改成功
     */
    @Override
    public Boolean updateByBo(XmUserWorkBo bo) {
        XmUserWork update = MapstructUtils.convert(bo, XmUserWork.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    /**
     * 保存前的数据校验
     */
    private void validEntityBeforeSave(XmUserWork entity){
        //TODO 做一些数据校验,如唯一约束
    }

    /**
     * 校验并批量删除用户作品（视频/课堂）—— 社区瀑布流与管理后台共用信息
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
