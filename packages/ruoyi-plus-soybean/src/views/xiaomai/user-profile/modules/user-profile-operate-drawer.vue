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
    return model.value.userId === null || model.value.userId === undefined ? '' : String(model.value.userId);
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

const avatarPreviewUrl = computed(() => {
  const value = model.value.avatarUrl?.trim() ?? '';

  if (!value) {
    return '';
  }

  return /^(https?:)?\/\//.test(value) || value.startsWith('/') || value.startsWith('data:') ? value : '';
});

function createDefaultModel(): Model {
  return {
    id: null,
    userId: null,
    userName: '',
    nickName: '',
    avatarUrl: '',
    bio: '',
    personalityType: '',
    teacherTags: '',
    language: '',
    isCompleted: 0
  };
}

type RuleKey = Extract<keyof Model, 'userId'>;

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

  const { id, userId, avatarUrl, bio, personalityType, teacherTags, language, isCompleted } = model.value;

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateUserProfile({
      userId,
      avatarUrl,
      bio,
      personalityType,
      teacherTags,
      language,
      isCompleted
    });
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateUserProfile({
      id,
      userId,
      avatarUrl,
      bio,
      personalityType,
      teacherTags,
      language,
      isCompleted
    });
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
        <NFormItem label="用户名">
          <NInput v-model:value="model.userName" placeholder="系统自动关联用户名" readonly />
        </NFormItem>
        <NFormItem label="用户昵称">
          <NInput v-model:value="model.nickName" placeholder="系统自动关联昵称" readonly />
        </NFormItem>
        <NFormItem label="头像URL" path="avatarUrl">
          <div class="w-full flex-col gap-12px">
            <NInput v-model:value="avatarUrlValue" placeholder="请输入头像URL" />
            <NImage
              v-if="avatarPreviewUrl"
              class="h-80px w-80px rounded-full object-cover"
              preview-disabled
              :src="avatarPreviewUrl"
            />
          </div>
        </NFormItem>
        <NFormItem label="个人简介" path="bio">
          <NInput v-model:value="model.bio" :rows="3" type="textarea" placeholder="请输入个人简介" />
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
          <NInput v-model:value="model.teacherTags" :rows="3" type="textarea" placeholder="请输入AI导师偏好" />
        </NFormItem>
        <NFormItem label="语言偏好" path="language">
          <DictSelect v-model:value="model.language" placeholder="请选择语言偏好" dict-code="sys_language" clearable />
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

<style scoped>
.flex-col {
  display: flex;
  flex-direction: column;
}

.gap-12px {
  gap: 12px;
}
</style>
