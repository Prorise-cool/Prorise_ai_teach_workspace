package org.dromara.xiaomai.user.profile.domain.vo;

import lombok.Data;

/**
 * 用户配置完成状态。
 *
 * @author Codex
 */
@Data
public class XmProfileCompletedVo {

    /** 是否完成配置 */
    private Boolean isCompleted;

    public XmProfileCompletedVo() {
    }

    public XmProfileCompletedVo(Boolean isCompleted) {
        this.isCompleted = isCompleted;
    }
}
