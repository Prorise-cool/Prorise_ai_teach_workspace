<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserWorkSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();
const model = defineModel<Api.Xiaomai.UserWorkSearchParams>('model', { required: true });
const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
  Object.assign(model.value, defaultModel);
}

async function reset() {
  await restoreValidation();
  resetModel();
  emit('search');
}

async function search() {
  await validate();
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="xiaomai-user-work-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="用户 ID" label-width="auto" path="userId" class="pr-24px">
              <NInputNumber v-model:value="model.userId" placeholder="请输入用户 ID" class="w-full" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="作品类型" label-width="auto" path="workType" class="pr-24px">
              <DictSelect v-model:value="model.workType" placeholder="请选择作品类型" dict-code="xm_user_work_type" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="来源任务 ID" label-width="auto" path="taskRefId" class="pr-24px">
              <NInput v-model:value="model.taskRefId" placeholder="请输入来源任务 ID" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="作品标题" label-width="auto" path="title" class="pr-24px">
              <NInput v-model:value="model.title" placeholder="请输入作品标题" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="公开状态" label-width="auto" path="isPublic" class="pr-24px">
              <DictSelect v-model:value="model.isPublic" placeholder="请选择公开状态" dict-code="xm_yes_no_numeric" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="管理状态" label-width="auto" path="status" class="pr-24px">
              <DictSelect v-model:value="model.status" placeholder="请选择管理状态" dict-code="xm_user_work_status" clearable />
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
