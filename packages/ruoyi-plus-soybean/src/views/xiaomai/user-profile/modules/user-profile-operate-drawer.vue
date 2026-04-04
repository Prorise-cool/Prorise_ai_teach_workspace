<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateUserProfile, fetchUpdateUserProfile } from '@/service/api/xiaomai/user-profile';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserProfileOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.Xiaomai.UserProfile | null;
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
    add: '新增用户配置',
    edit: '编辑用户配置'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.UserProfileOperateParams;

const model = ref<Model>(createDefaultModel());

const userIdInput = computed<string>({
  get() {
    return model.value.userId == null ? '' : String(model.value.userId);
  },
  set(value) {
    model.value.userId = value === '' ? null : Number(value);
  }
});

const avatarUrlValue = computed<string>({
  get() {
    return model.value.avatarUrl ?? '';
  },
  set(value) {
    model.value.avatarUrl = value;
  }
});

function createDefaultModel(): Model {
  return {
      id: null,
      userId: null,
      avatarUrl: '',
      bio: '',
      personalityType: '',
      teacherTags: '',
      language: '',
  };
}

type RuleKey = Extract<
  keyof Model,
  | 'userId'
>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  userId: createRequiredRule('用户ID不能为空')
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

  const { id, userId, avatarUrl, bio, personalityType, teacherTags, language } = model.value;

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateUserProfile({ userId, avatarUrl, bio, personalityType, teacherTags, language });
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateUserProfile({ id, userId, avatarUrl, bio, personalityType, teacherTags, language });
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
        <NFormItem label="用户ID" path="userId">
          <NInput v-model:value="userIdInput" placeholder="请输入用户ID" />
        </NFormItem>
        <NFormItem label="头像URL" path="avatarUrl">
          <OssUpload v-model:value="avatarUrlValue" upload-type="image" />
        </NFormItem>
        <NFormItem label="个人简介" path="bio">
          <NInput
            v-model:value="model.bio"
            :rows="3"
            type="textarea"
            placeholder="请输入个人简介"
          />
        </NFormItem>
        <NFormItem label="性格类型" path="personalityType">
          <DictSelect
            v-model:value="model.personalityType"
            placeholder="请选择性格类型"
            dict-code="user_personality_type"
            clearable
          />
        </NFormItem>
        <NFormItem label="AI导师偏好" path="teacherTags">
          <NInput
            v-model:value="model.teacherTags"
            :rows="3"
            type="textarea"
            placeholder="请输入AI导师偏好"
          />
        </NFormItem>
        <NFormItem label="语言偏好" path="language">
          <DictSelect
            v-model:value="model.language"
            placeholder="请选择语言偏好"
            dict-code="sys_language"
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
