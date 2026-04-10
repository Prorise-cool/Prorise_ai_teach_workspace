<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateAiResource, fetchUpdateAiResource } from '@/service/api/xiaomai/ai-resource';
import { fetchGetAiProviderList } from '@/service/api/xiaomai/ai-provider';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'AiResourceOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Xiaomai.AiResource | null;
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

/** Provider 下拉选项 */
interface ProviderOption {
  id: number;
  label: string;
  providerCode: string;
  vendorCode: string;
}
const providerOptions = ref<ProviderOption[]>([]);

async function loadProviderOptions() {
  const { data, error } = await fetchGetAiProviderList({ pageSize: 100 });
  if (!error && data) {
    providerOptions.value = (data.rows || []).map((item: any) => ({
      id: item.id,
      label: `${item.providerName} (${item.providerCode})`,
      providerCode: item.providerCode,
      vendorCode: item.vendorCode
    }));
  }
}

onMounted(() => {
  loadProviderOptions();
});

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增 AI 资源',
    edit: '编辑 AI 资源'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.AiResourceOperateParams;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    id: null,
    providerId: null,
    capability: 'llm',
    resourceCode: '',
    resourceName: '',
    resourceType: '',
    runtimeProviderId: '',
    modelName: '',
    voiceCode: '',
    languageCode: '',
    resourceSettingsJson: '',
    status: '0',
    sortOrder: 0,
    remark: ''
  };
}

type RuleKey = Extract<
  keyof Model,
  'providerId' | 'capability' | 'resourceCode' | 'resourceName' | 'runtimeProviderId' | 'status'
>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  providerId: createRequiredRule('请选择供应商'),
  capability: createRequiredRule('能力类型不能为空'),
  resourceCode: createRequiredRule('资源编码不能为空'),
  resourceName: createRequiredRule('资源名称不能为空'),
  runtimeProviderId: createRequiredRule('运行时 Provider ID 不能为空'),
  status: createRequiredRule('状态不能为空')
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
    providerId: model.value.providerId,
    capability: model.value.capability,
    resourceCode: model.value.resourceCode,
    resourceName: model.value.resourceName,
    resourceType: model.value.resourceType,
    runtimeProviderId: model.value.runtimeProviderId,
    modelName: model.value.modelName,
    voiceCode: model.value.voiceCode,
    languageCode: model.value.languageCode,
    resourceSettingsJson: model.value.resourceSettingsJson,
    status: model.value.status,
    sortOrder: model.value.sortOrder,
    remark: model.value.remark
  };

  if (props.operateType === 'add') {
    const { error } = await fetchCreateAiResource(payload);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateAiResource(payload);
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
        <NFormItem label="供应商" path="providerId">
          <NSelect
            v-model:value="model.providerId"
            :options="providerOptions.map(o => ({ label: o.label, value: o.id }))"
            placeholder="请选择供应商"
            filterable
          />
        </NFormItem>
        <NFormItem label="能力类型" path="capability">
          <DictSelect v-model:value="model.capability" placeholder="请选择能力类型" dict-code="xm_ai_capability" />
        </NFormItem>
        <NFormItem label="资源编码" path="resourceCode">
          <NInput v-model:value="model.resourceCode" placeholder="请输入资源编码" />
        </NFormItem>
        <NFormItem label="资源名称" path="resourceName">
          <NInput v-model:value="model.resourceName" placeholder="请输入资源名称" />
        </NFormItem>
        <NFormItem label="资源类型" path="resourceType">
          <DictSelect
            v-model:value="model.resourceType"
            placeholder="请选择资源类型"
            dict-code="xm_ai_resource_type"
            clearable
          />
        </NFormItem>
        <NFormItem label="运行时 Provider ID" path="runtimeProviderId">
          <NInput v-model:value="model.runtimeProviderId" placeholder="请输入运行时 Provider ID" />
        </NFormItem>
        <NFormItem label="模型名称" path="modelName">
          <NInput v-model:value="model.modelName" placeholder="请输入模型名称" />
        </NFormItem>
        <NFormItem label="音色编码" path="voiceCode">
          <NInput v-model:value="model.voiceCode" placeholder="请输入音色编码" />
        </NFormItem>
        <NFormItem label="语言编码" path="languageCode">
          <NInput v-model:value="model.languageCode" placeholder="请输入语言编码" />
        </NFormItem>
        <NFormItem label="资源扩展配置 JSON" path="resourceSettingsJson">
          <NInput
            v-model:value="model.resourceSettingsJson"
            :rows="3"
            type="textarea"
            placeholder="请输入资源扩展配置 JSON"
          />
        </NFormItem>
        <NFormItem label="状态" path="status">
          <DictRadio v-model:value="model.status" dict-code="sys_normal_disable" />
        </NFormItem>
        <NFormItem label="排序号" path="sortOrder">
          <NInputNumber v-model:value="model.sortOrder" placeholder="请输入排序号" class="w-full" />
        </NFormItem>
        <NFormItem label="备注" path="remark">
          <NInput v-model:value="model.remark" :rows="3" type="textarea" placeholder="请输入备注" />
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
