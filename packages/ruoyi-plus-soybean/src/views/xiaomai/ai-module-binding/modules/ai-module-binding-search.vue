<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'AiModuleBindingSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();
const model = defineModel<Api.Xiaomai.AiModuleBindingSearchParams>('model', { required: true });
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
      <NCollapseItem :title="$t('common.search')" name="xiaomai-ai-module-binding-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="模块主键" label-width="auto" path="moduleId" class="pr-24px">
              <NInputNumber v-model:value="model.moduleId" placeholder="请输入模块主键" class="w-full" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="阶段编码" label-width="auto" path="stageCode" class="pr-24px">
              <NInput v-model:value="model.stageCode" placeholder="请输入阶段编码" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="能力类型" label-width="auto" path="capability" class="pr-24px">
              <DictSelect
                v-model:value="model.capability"
                placeholder="请选择能力类型"
                dict-code="xm_ai_capability"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="角色编码" label-width="auto" path="roleCode" class="pr-24px">
              <NInput v-model:value="model.roleCode" placeholder="请输入角色编码" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="资源主键" label-width="auto" path="resourceId" class="pr-24px">
              <NInputNumber v-model:value="model.resourceId" placeholder="请输入资源主键" class="w-full" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="健康来源" label-width="auto" path="healthSource" class="pr-24px">
              <DictSelect
                v-model:value="model.healthSource"
                placeholder="请选择健康来源"
                dict-code="xm_ai_health_source"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="状态" label-width="auto" path="status" class="pr-24px">
              <DictSelect
                v-model:value="model.status"
                placeholder="请选择状态"
                dict-code="sys_normal_disable"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="默认链路" label-width="auto" path="isDefault" class="pr-24px">
              <DictSelect
                v-model:value="model.isDefault"
                placeholder="请选择默认链路"
                dict-code="sys_yes_no"
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
