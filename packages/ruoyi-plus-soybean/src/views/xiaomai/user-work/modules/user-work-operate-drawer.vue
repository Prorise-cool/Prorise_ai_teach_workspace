<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateUserWork, fetchUpdateUserWork } from '@/service/api/xiaomai/user-work';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserWorkOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Xiaomai.UserWork | null;
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
    add: '新增用户作品',
    edit: '编辑用户作品'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.UserWorkOperateParams;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    id: null,
    userId: null,
    workType: '',
    taskRefId: '',
    title: '',
    description: '',
    coverOssId: null,
    coverUrl: '',
    isPublic: 0,
    status: 'normal',
    viewCount: 0,
    likeCount: 0
  };
}

type RuleKey = Extract<keyof Model, 'userId' | 'workType' | 'taskRefId' | 'title' | 'isPublic' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  userId: createRequiredRule('用户 ID 不能为空'),
  workType: createRequiredRule('作品类型不能为空'),
  taskRefId: createRequiredRule('来源任务 ID 不能为空'),
  title: createRequiredRule('作品标题不能为空'),
  isPublic: createRequiredRule('公开状态不能为空'),
  status: createRequiredRule('管理状态不能为空')
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

  const payload = {
    id: model.value.id,
    userId: model.value.userId,
    workType: model.value.workType,
    taskRefId: model.value.taskRefId,
    title: model.value.title,
    description: model.value.description,
    coverOssId: model.value.coverOssId,
    coverUrl: model.value.coverUrl,
    isPublic: model.value.isPublic,
    status: model.value.status,
    viewCount: model.value.viewCount,
    likeCount: model.value.likeCount
  };

  if (props.operateType === 'add') {
    const { error } = await fetchCreateUserWork(payload);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateUserWork(payload);
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
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="760" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem label="用户 ID" path="userId">
          <NInputNumber v-model:value="model.userId" placeholder="请输入用户 ID" class="w-full" />
        </NFormItem>
        <NFormItem label="作品类型" path="workType">
          <DictSelect v-model:value="model.workType" placeholder="请选择作品类型" dict-code="xm_user_work_type" />
        </NFormItem>
        <NFormItem label="来源任务 ID" path="taskRefId">
          <NInput v-model:value="model.taskRefId" placeholder="请输入来源任务 ID" />
        </NFormItem>
        <NFormItem label="作品标题" path="title">
          <NInput v-model:value="model.title" placeholder="请输入作品标题" />
        </NFormItem>
        <NFormItem label="作品描述" path="description">
          <NInput v-model:value="model.description" :rows="3" type="textarea" placeholder="请输入作品描述" />
        </NFormItem>
        <NFormItem label="封面 OSS ID" path="coverOssId">
          <NInputNumber v-model:value="model.coverOssId" placeholder="请输入封面 OSS ID" class="w-full" />
        </NFormItem>
        <NFormItem label="封面地址" path="coverUrl">
          <NInput v-model:value="model.coverUrl" placeholder="请输入封面地址" />
        </NFormItem>
        <NFormItem label="公开状态" path="isPublic">
          <DictRadio v-model:value="model.isPublic" dict-code="xm_yes_no_numeric" />
        </NFormItem>
        <NFormItem label="管理状态" path="status">
          <DictRadio v-model:value="model.status" dict-code="xm_user_work_status" />
        </NFormItem>
        <NFormItem label="浏览量" path="viewCount">
          <NInputNumber v-model:value="model.viewCount" placeholder="请输入浏览量" class="w-full" />
        </NFormItem>
        <NFormItem label="点赞量" path="likeCount">
          <NInputNumber v-model:value="model.likeCount" placeholder="请输入点赞量" class="w-full" />
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
