<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'AiModuleSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();
const model = defineModel<Api.Xiaomai.AiModuleSearchParams>('model', { required: true });
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
      <NCollapseItem :title="$t('common.search')" name="xiaomai-ai-module-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="模块编码" label-width="auto" path="moduleCode" class="pr-24px">
              <NInput v-model:value="model.moduleCode" placeholder="请输入模块编码" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="模块名称" label-width="auto" path="moduleName" class="pr-24px">
              <NInput v-model:value="model.moduleName" placeholder="请输入模块名称" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="状态" label-width="auto" path="status" class="pr-24px">
              <DictSelect v-model:value="model.status" placeholder="请选择状态" dict-code="sys_normal_disable" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="排序号" label-width="auto" path="sortOrder" class="pr-24px">
              <NInputNumber v-model:value="model.sortOrder" placeholder="请输入排序号" class="w-full" />
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
