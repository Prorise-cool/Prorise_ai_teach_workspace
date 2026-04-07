<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'VideoTaskSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const dateRangeStartTime = ref<[string, string] | null>(null);
const dateRangeCompleteTime = ref<[string, string] | null>(null);
const dateRangeFailTime = ref<[string, string] | null>(null);
const model = defineModel<Api.Xiaomai.VideoTaskSearchParams>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
  dateRangeStartTime.value = null;
  dateRangeCompleteTime.value = null;
  dateRangeFailTime.value = null;
  Object.assign(model.value, defaultModel);
}

async function reset() {
  await restoreValidation();
  resetModel();
  emit('search');
}

async function search() {
  await validate();
  if (dateRangeStartTime.value?.length) {
    model.value.params!.beginStartTime = dateRangeStartTime.value[0];
    model.value.params!.endStartTime = dateRangeStartTime.value[1];
  }
  if (dateRangeCompleteTime.value?.length) {
    model.value.params!.beginCompleteTime = dateRangeCompleteTime.value[0];
    model.value.params!.endCompleteTime = dateRangeCompleteTime.value[1];
  }
  if (dateRangeFailTime.value?.length) {
    model.value.params!.beginFailTime = dateRangeFailTime.value[0];
    model.value.params!.endFailTime = dateRangeFailTime.value[1];
  }
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="xiaomai-video-task-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="任务ID" label-width="auto" path="taskId" class="pr-24px">
              <NInput v-model:value="model.taskId" placeholder="请输入任务ID" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="用户ID（关联 sys_user.user_id）" label-width="auto" path="userId" class="pr-24px">
              <NInputNumber v-model:value="model.userId" placeholder="请输入用户ID（关联 sys_user.user_id）" class="w-full" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="任务类型" label-width="auto" path="taskType" class="pr-24px">
              <NInput v-model:value="model.taskType" placeholder="请输入任务类型" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="任务状态" label-width="auto" path="taskState" class="pr-24px">
              <DictSelect
                v-model:value="model.taskState"
                placeholder="请选择任务状态"
                dict-code="xm_task_status"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="任务摘要" label-width="auto" path="summary" class="pr-24px">
              <NInput v-model:value="model.summary" placeholder="请输入任务摘要" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="结果资源标识" label-width="auto" path="resultRef" class="pr-24px">
              <NInput v-model:value="model.resultRef" placeholder="请输入结果资源标识" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="结果详情标识" label-width="auto" path="detailRef" class="pr-24px">
              <NInput v-model:value="model.detailRef" placeholder="请输入结果详情标识" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="失败摘要" label-width="auto" path="errorSummary" class="pr-24px">
              <NInput v-model:value="model.errorSummary" placeholder="请输入失败摘要" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="来源会话ID" label-width="auto" path="sourceSessionId" class="pr-24px">
              <NInput v-model:value="model.sourceSessionId" placeholder="请输入来源会话ID" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="来源产物引用" label-width="auto" path="sourceArtifactRef" class="pr-24px">
              <NInput v-model:value="model.sourceArtifactRef" placeholder="请输入来源产物引用" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="回看定位提示" label-width="auto" path="replayHint" class="pr-24px">
              <NInput v-model:value="model.replayHint" placeholder="请输入回看定位提示" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="开始时间" label-width="auto" path="startTime" class="pr-24px">
              <NDatePicker
                v-model:formatted-value="dateRangeStartTime"
                type="datetimerange"
                value-format="yyyy-MM-dd HH:mm:ss"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="完成时间" label-width="auto" path="completeTime" class="pr-24px">
              <NDatePicker
                v-model:formatted-value="dateRangeCompleteTime"
                type="datetimerange"
                value-format="yyyy-MM-dd HH:mm:ss"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="失败时间" label-width="auto" path="failTime" class="pr-24px">
              <NDatePicker
                v-model:formatted-value="dateRangeFailTime"
                type="datetimerange"
                value-format="yyyy-MM-dd HH:mm:ss"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi :show-feedback="false" span="24" class="pr-24px">
              <NSpace class="w-full" justify="end">
                <NButton @click="reset">
                  <template #icon>
                    <icon-ic-round-refresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <icon-ic-round-search class="text-icon" />
                  </template>
                  {{ $t('common.search') }}
                </NButton>
              </NSpace>
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>

<style scoped></style>
