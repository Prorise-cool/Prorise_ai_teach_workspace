-- Epic 10 Story 10.1
-- 长期业务数据相关字典基线

SET @dict_type_base := IFNULL((SELECT MAX(dict_id) FROM sys_dict_type), 0);
SET @dict_data_base := IFNULL((SELECT MAX(dict_code) FROM sys_dict_data), 0);

INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_type_base + 1, '000000', '小麦任务状态', 'xm_task_status', 103, 1, SYSDATE(), NULL, NULL, 'Epic 10 长期任务状态字典'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'xm_task_status');

INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_type_base + 2, '000000', '小麦问答状态', 'xm_turn_status', 103, 1, SYSDATE(), NULL, NULL, 'Epic 10 问答降级与失败状态'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'xm_turn_status');

INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_type_base + 3, '000000', '小麦学习结果类型', 'xm_learning_result_type', 103, 1, SYSDATE(), NULL, NULL, 'Epic 10 Learning Coach 结果类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'xm_learning_result_type');

INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_type_base + 4, '000000', '小麦学习记录类型', 'xm_learning_record_type', 103, 1, SYSDATE(), NULL, NULL, 'Epic 10 学习中心聚合记录类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'xm_learning_record_type');

INSERT INTO sys_dict_type (
    dict_id, tenant_id, dict_name, dict_type, create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_type_base + 5, '000000', '小麦产物类型', 'xm_artifact_type', 103, 1, SYSDATE(), NULL, NULL, 'Epic 10 SessionArtifactGraph 产物类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'xm_artifact_type');

INSERT INTO sys_dict_data (
    dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default,
    create_dept, create_by, create_time, update_by, update_time, remark
)
SELECT @dict_data_base + 1, '000000', 1, '待处理', 'pending', 'xm_task_status', '', 'info', 'N', 103, 1, SYSDATE(), NULL, NULL, '任务待处理'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_task_status' AND dict_value = 'pending');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 2, '000000', 2, '处理中', 'processing', 'xm_task_status', '', 'warning', 'N', 103, 1, SYSDATE(), NULL, NULL, '任务处理中'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_task_status' AND dict_value = 'processing');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 3, '000000', 3, '已完成', 'completed', 'xm_task_status', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '任务已完成'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_task_status' AND dict_value = 'completed');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 4, '000000', 4, '已失败', 'failed', 'xm_task_status', '', 'danger', 'N', 103, 1, SYSDATE(), NULL, NULL, '任务已失败'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_task_status' AND dict_value = 'failed');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 5, '000000', 5, '已取消', 'cancelled', 'xm_task_status', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '任务已取消'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_task_status' AND dict_value = 'cancelled');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 6, '000000', 1, '完整成功', 'success', 'xm_turn_status', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '问答完整成功'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_turn_status' AND dict_value = 'success');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 7, '000000', 2, '部分成功', 'partial_success', 'xm_turn_status', '', 'warning', 'N', 103, 1, SYSDATE(), NULL, NULL, '主回答成功但附加信息不完整'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_turn_status' AND dict_value = 'partial_success');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 8, '000000', 3, '白板降级', 'whiteboard_degraded', 'xm_turn_status', '', 'warning', 'N', 103, 1, SYSDATE(), NULL, NULL, '白板动作降级'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_turn_status' AND dict_value = 'whiteboard_degraded');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 9, '000000', 4, '引用缺失', 'citation_missing', 'xm_turn_status', '', 'danger', 'N', 103, 1, SYSDATE(), NULL, NULL, '引用来源缺失'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_turn_status' AND dict_value = 'citation_missing');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 10, '000000', 5, '整体失败', 'failed', 'xm_turn_status', '', 'danger', 'N', 103, 1, SYSDATE(), NULL, NULL, '整体失败'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_turn_status' AND dict_value = 'failed');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 11, '000000', 1, 'Checkpoint', 'checkpoint', 'xm_learning_result_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习结果 Checkpoint'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_result_type' AND dict_value = 'checkpoint');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 12, '000000', 2, 'Quiz', 'quiz', 'xm_learning_result_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习结果 Quiz'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_result_type' AND dict_value = 'quiz');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 13, '000000', 3, 'Wrongbook', 'wrongbook', 'xm_learning_result_type', '', 'warning', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习结果错题本'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_result_type' AND dict_value = 'wrongbook');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 14, '000000', 4, 'Recommendation', 'recommendation', 'xm_learning_result_type', '', 'success', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习结果推荐'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_result_type' AND dict_value = 'recommendation');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 15, '000000', 5, 'Path', 'path', 'xm_learning_result_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习结果路径'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_result_type' AND dict_value = 'path');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 16, '000000', 1, '视频', 'video', 'xm_learning_record_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录视频类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'video');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 17, '000000', 2, '课堂', 'classroom', 'xm_learning_record_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录课堂类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'classroom');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 18, '000000', 3, 'Companion', 'companion', 'xm_learning_record_type', '', 'warning', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录 Companion 类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'companion');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 19, '000000', 4, 'Evidence', 'evidence', 'xm_learning_record_type', '', 'warning', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录 Evidence 类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'evidence');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 20, '000000', 5, 'Checkpoint', 'checkpoint', 'xm_learning_record_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录 Checkpoint 类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'checkpoint');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 21, '000000', 6, 'Quiz', 'quiz', 'xm_learning_record_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录 Quiz 类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'quiz');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 22, '000000', 7, 'Wrongbook', 'wrongbook', 'xm_learning_record_type', '', 'danger', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录错题类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'wrongbook');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 23, '000000', 8, 'Recommendation', 'recommendation', 'xm_learning_record_type', '', 'success', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录推荐类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'recommendation');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 24, '000000', 9, 'Path', 'path', 'xm_learning_record_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '学习记录路径类型'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_learning_record_type' AND dict_value = 'path');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 25, '000000', 1, '时间线', 'timeline', 'xm_artifact_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '视频/课堂时间线产物'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_artifact_type' AND dict_value = 'timeline');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 26, '000000', 2, '分镜', 'segment', 'xm_artifact_type', '', 'primary', 'N', 103, 1, SYSDATE(), NULL, NULL, '分镜产物'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_artifact_type' AND dict_value = 'segment');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 27, '000000', 3, '旁白', 'narration', 'xm_artifact_type', '', 'warning', 'N', 103, 1, SYSDATE(), NULL, NULL, '旁白产物'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_artifact_type' AND dict_value = 'narration');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 28, '000000', 4, '幻灯片', 'slide', 'xm_artifact_type', '', 'success', 'N', 103, 1, SYSDATE(), NULL, NULL, '课堂幻灯片产物'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_artifact_type' AND dict_value = 'slide');

INSERT INTO sys_dict_data
SELECT @dict_data_base + 29, '000000', 5, '白板步骤', 'whiteboard_step', 'xm_artifact_type', '', 'default', 'N', 103, 1, SYSDATE(), NULL, NULL, '白板步骤产物'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'xm_artifact_type' AND dict_value = 'whiteboard_step');
