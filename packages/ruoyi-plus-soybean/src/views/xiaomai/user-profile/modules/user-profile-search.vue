<script setup lang="ts">
import { computed, ref, toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserProfileSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const dateRangeCreateTime = ref<[string, string] | null>(null);
const dateRangeUpdateTime = ref<[string, string] | null>(null);
const model = defineModel<Api.Xiaomai.UserProfileSearchParams>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

function normalizeYesNoDictValue(value: number | string | null | undefined) {
  if (value === 1 || value === '1' || value === 'Y') {
    return 'Y';
  }

  if (value === 0 || value === '0' || value === 'N') {
    return 'N';
  }

  return null;
}

const isCompletedValue = computed<string | null | undefined>({
  get() {
    return normalizeYesNoDictValue(model.value.isCompleted);
  },
  set(value) {
    if (!value) {
      model.value.isCompleted = null;
      return;
    }

    model.value.isCompleted = value === 'Y' ? 1 : 0;
  }
});

function resetModel() {
  dateRangeCreateTime.value = null;
  dateRangeUpdateTime.value = null;
  Object.assign(model.value, defaultModel);
}

async function reset() {
  await restoreValidation();
  resetModel();
  emit('search');
}

async function search() {
  await validate();
  if (!model.value.params) {
    model.value.params = {};
  }
  const params = model.value.params;
  if (dateRangeCreateTime.value?.length) {
    params.beginCreateTime = dateRangeCreateTime.value[0];
    params.endCreateTime = dateRangeCreateTime.value[1];
  } else {
    params.beginCreateTime = undefined;
    params.endCreateTime = undefined;
  }
  if (dateRangeUpdateTime.value?.length) {
    params.beginUpdateTime = dateRangeUpdateTime.value[0];
    params.endUpdateTime = dateRangeUpdateTime.value[1];
  } else {
    params.beginUpdateTime = undefined;
    params.endUpdateTime = undefined;
  }
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="xiaomai-user-profile-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="用户名" label-width="auto" path="userName" class="pr-24px">
              <NInput v-model:value="model.userName" placeholder="请输入用户名" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="个人简介" label-width="auto" path="bio" class="pr-24px">
              <NInput v-model:value="model.bio" placeholder="请输入个人简介" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="性格类型" label-width="auto" path="personalityType" class="pr-24px">
              <DictSelect
                v-model:value="model.personalityType"
                placeholder="请选择性格类型"
                dict-code="user_personality_type"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="语言偏好" label-width="auto" path="language" class="pr-24px">
              <DictSelect
                v-model:value="model.language"
                placeholder="请选择语言偏好"
                dict-code="sys_language"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="是否完成配置" label-width="auto" path="isCompleted" class="pr-24px">
              <DictSelect
                v-model:value="isCompletedValue"
                placeholder="请选择是否完成配置"
                dict-code="sys_yes_no"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="创建时间" label-width="auto" path="createTime" class="pr-24px">
              <NDatePicker
                v-model:formatted-value="dateRangeCreateTime"
                type="datetimerange"
                value-format="yyyy-MM-dd HH:mm:ss"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="更新时间" label-width="auto" path="updateTime" class="pr-24px">
              <NDatePicker
                v-model:formatted-value="dateRangeUpdateTime"
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
