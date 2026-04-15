<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'AiResourceSearch'
});

interface Props {
  providerOptions?: Array<{ label: string; value: number }>;
}

withDefaults(defineProps<Props>(), {
  providerOptions: () => []
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();
const model = defineModel<Api.Xiaomai.AiResourceSearchParams>('model', { required: true });
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
      <NCollapseItem :title="$t('common.search')" name="xiaomai-ai-resource-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="Provider" label-width="auto" path="providerId" class="pr-24px">
              <NSelect
                v-model:value="model.providerId"
                :options="providerOptions"
                placeholder="全部"
                clearable
                filterable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="能力类型" label-width="auto" path="capability" class="pr-24px">
              <DictSelect v-model:value="model.capability" placeholder="全部" dict-code="xm_ai_capability" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="资源名称" label-width="auto" path="resourceName" class="pr-24px">
              <NInput v-model:value="model.resourceName" placeholder="按名称搜索" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="状态" label-width="auto" path="status" class="pr-24px">
              <DictSelect v-model:value="model.status" placeholder="全部" dict-code="sys_normal_disable" clearable />
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
