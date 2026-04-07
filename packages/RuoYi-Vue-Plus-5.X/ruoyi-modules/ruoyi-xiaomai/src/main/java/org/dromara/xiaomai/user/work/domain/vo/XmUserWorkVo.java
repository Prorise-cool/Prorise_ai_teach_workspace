package org.dromara.xiaomai.user.work.domain.vo;

import org.dromara.xiaomai.user.work.domain.XmUserWork;
import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import org.dromara.common.excel.annotation.ExcelDictFormat;
import org.dromara.common.excel.convert.ExcelDictConvert;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;



/**
 * 用户作品（视频/课堂）—— 社区瀑布流与管理后台共用视图对象 xm_user_work
 *
 * @author Lion Li
 * @date 2026-04-07
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = XmUserWork.class)
public class XmUserWorkVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键（Snowflake）
     */
    @ExcelProperty(value = "主键")
    private Long id;

    /**
     * 作品所有者（关联 sys_user.user_id）
     */
    @ExcelProperty(value = "作品所有者")
    private Long userId;

    /**
     * 作品类型（video / classroom）
     */
    @ExcelProperty(value = "作品类型", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_user_work_type")
    private String workType;

    /**
     * 来源任务ID（对应 xm_video_task.task_id 或 xm_classroom_session.task_id）
     */
    @ExcelProperty(value = "来源任务ID")
    private String taskRefId;

    /**
     * 作品标题
     */
    @ExcelProperty(value = "作品标题")
    private String title;

    /**
     * 作品描述
     */
    @ExcelProperty(value = "作品描述")
    private String description;

    /**
     * 封面图 OSS ID（关联 sys_oss.oss_id）
     */
    @ExcelProperty(value = "封面图 OSS ID")
    private Long coverOssId;

    /**
     * 封面图直链（冗余缓存，避免高频 JOIN sys_oss）
     */
    @ExcelProperty(value = "封面图直链")
    private String coverUrl;

    /**
     * 是否公开到社区（0-私有 1-公开）
     */
    @ExcelProperty(value = "是否公开到社区", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_yes_no_numeric")
    private Long isPublic;

    /**
     * 管理状态（normal/hidden/blocked）—— 管理员在 RuoYi 后台可操作
     */
    @ExcelProperty(value = "管理状态", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "xm_user_work_status")
    private String status;

    /**
     * 浏览量
     */
    @ExcelProperty(value = "浏览量")
    private Long viewCount;

    /**
     * 点赞量
     */
    @ExcelProperty(value = "点赞量")
    private Long likeCount;


}
