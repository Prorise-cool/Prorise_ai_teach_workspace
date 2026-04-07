<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateVideoTask, fetchUpdateVideoTask } from '@/service/api/xiaomai/video-task';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'VideoTaskOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.Xiaomai.VideoTask | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { createRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增视频任务',
    edit: '编辑视频任务'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.VideoTaskOperateParams;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
      id: null,
      taskId: '',
      userId: null,
      taskType: '',
      taskState: '',
      summary: '',
      resultRef: '',
      detailRef: '',
      errorSummary: '',
      sourceSessionId: '',
      sourceArtifactRef: '',
      replayHint: '',
      startTime: null,
      completeTime: null,
      failTime: null,
  };
}

type RuleKey = Extract<
  keyof Model,
  | 'taskId'
  | 'userId'
  | 'taskType'
  | 'taskState'
  | 'summary'
>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  taskId: createRequiredRule('任务ID不能为空'),
  userId: createRequiredRule('用户ID（关联 sys_user.user_id）不能为空'),
  taskType: createRequiredRule('任务类型不能为空'),
  taskState: createRequiredRule('任务状态不能为空'),
  summary: createRequiredRule('任务摘要不能为空')
};

function handleUpdateModelWhenEdit() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const { id, taskId, userId, taskType, taskState, summary, resultRef, detailRef, errorSummary, sourceSessionId, sourceArtifactRef, replayHint, startTime, completeTime, failTime } = model.value;

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateVideoTask({ taskId, userId, taskType, taskState, summary, resultRef, detailRef, errorSummary, sourceSessionId, sourceArtifactRef, replayHint, startTime, completeTime, failTime });
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateVideoTask({ id, taskId, userId, taskType, taskState, summary, resultRef, detailRef, errorSummary, sourceSessionId, sourceArtifactRef, replayHint, startTime, completeTime, failTime });
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }

  closeDrawer();
  emit('submitted');
}

watch(visible, () => {
  if (visible.value) {
    handleUpdateModelWhenEdit();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="800" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem label="任务ID" path="taskId">
          <NInput v-model:value="model.taskId" placeholder="请输入任务ID" />
        </NFormItem>
        <NFormItem label="用户ID（关联 sys_user.user_id）" path="userId">
          <NInputNumber v-model:value="model.userId" placeholder="请输入用户ID（关联 sys_user.user_id）" class="w-full" />
        </NFormItem>
        <NFormItem label="任务类型" path="taskType">
          <NInput v-model:value="model.taskType" placeholder="请输入任务类型" />
        </NFormItem>
        <NFormItem label="任务状态" path="taskState">
          <DictSelect
            v-model:value="model.taskState"
            placeholder="请选择任务状态"
            dict-code="xm_task_status"
            clearable
          />
        </NFormItem>
        <NFormItem label="任务摘要" path="summary">
          <NInput v-model:value="model.summary" placeholder="请输入任务摘要" />
        </NFormItem>
        <NFormItem label="结果资源标识" path="resultRef">
          <NInput v-model:value="model.resultRef" placeholder="请输入结果资源标识" />
        </NFormItem>
        <NFormItem label="结果详情标识" path="detailRef">
          <NInput v-model:value="model.detailRef" placeholder="请输入结果详情标识" />
        </NFormItem>
        <NFormItem label="失败摘要" path="errorSummary">
          <NInput
            v-model:value="model.errorSummary"
            :rows="3"
            type="textarea"
            placeholder="请输入失败摘要"
          />
        </NFormItem>
        <NFormItem label="来源会话ID" path="sourceSessionId">
          <NInput v-model:value="model.sourceSessionId" placeholder="请输入来源会话ID" />
        </NFormItem>
        <NFormItem label="来源产物引用" path="sourceArtifactRef">
          <NInput v-model:value="model.sourceArtifactRef" placeholder="请输入来源产物引用" />
        </NFormItem>
        <NFormItem label="回看定位提示" path="replayHint">
          <NInput v-model:value="model.replayHint" placeholder="请输入回看定位提示" />
        </NFormItem>
        <NFormItem label="开始时间" path="startTime">
          <NDatePicker
            v-model:formatted-value="model.startTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            clearable
          />
        </NFormItem>
        <NFormItem label="完成时间" path="completeTime">
          <NDatePicker
            v-model:formatted-value="model.completeTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            clearable
          />
        </NFormItem>
        <NFormItem label="失败时间" path="failTime">
          <NDatePicker
            v-model:formatted-value="model.failTime"
            type="datetime"
            value-format="yyyy-MM-dd HH:mm:ss"
            clearable
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
