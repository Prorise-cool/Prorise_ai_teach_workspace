package org.dromara.xiaomai.constant;

/**
 * 小麦业务权限常量。
 *
 * @author Codex
 */
public final class XmPermissionConstants {

    private XmPermissionConstants() {
    }

    public static final String MODULE_PREFIX = "xiaomai:module";
    public static final String MODULE_LIST = MODULE_PREFIX + ":list";
    public static final String MODULE_QUERY = MODULE_PREFIX + ":query";
    public static final String MODULE_EXPORT = MODULE_PREFIX + ":export";

    public static final String VIDEO_TASK_PREFIX = "video:task";
    public static final String CLASSROOM_SESSION_PREFIX = "classroom:session";
    public static final String LEARNING_RECORD_PREFIX = "learning:record";
    public static final String LEARNING_FAVORITE_PREFIX = "learning:favorite";
    public static final String COMPANION_TURN_PREFIX = "companion:turn";
    public static final String EVIDENCE_CHAT_PREFIX = "evidence:chat";
    public static final String LEARNING_COACH_PREFIX = "learning:coach";
    public static final String AUDIT_PREFIX = "xiaomai:audit";
}
