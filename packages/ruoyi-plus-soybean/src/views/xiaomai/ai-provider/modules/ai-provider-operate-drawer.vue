<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateAiProvider, fetchUpdateAiProvider } from '@/service/api/xiaomai/ai-provider';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'AiProviderOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Xiaomai.AiProvider | null;
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
    add: '新增 AI Provider',
    edit: '编辑 AI Provider'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.AiProviderOperateParams;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    id: null,
    providerCode: '',
    providerName: '',
    vendorCode: '',
    authType: 'api_key',
    endpointUrl: '',
    appId: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    extraAuthJson: '',
    status: '0',
    sortOrder: 0,
    remark: ''
  };
}

type RuleKey = Extract<keyof Model, 'providerCode' | 'providerName' | 'vendorCode' | 'authType' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  providerCode: createRequiredRule('Provider 编码不能为空'),
  providerName: createRequiredRule('Provider 名称不能为空'),
  vendorCode: createRequiredRule('供应商不能为空'),
  authType: createRequiredRule('鉴权类型不能为空'),
  status: createRequiredRule('状态不能为空')
};

function handleUpdateModelWhenEdit() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
    model.value.apiKey = '';
    model.value.apiSecret = '';
    model.value.accessToken = '';
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const payload = {
    id: model.value.id,
    providerCode: model.value.providerCode,
    providerName: model.value.providerName,
    vendorCode: model.value.vendorCode,
    authType: model.value.authType,
    endpointUrl: model.value.endpointUrl,
    appId: model.value.appId,
    apiKey: model.value.apiKey,
    apiSecret: model.value.apiSecret,
    accessToken: model.value.accessToken,
    extraAuthJson: model.value.extraAuthJson,
    status: model.value.status,
    sortOrder: model.value.sortOrder,
    remark: model.value.remark
  };

  if (props.operateType === 'add') {
    const { error } = await fetchCreateAiProvider(payload);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateAiProvider(payload);
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
        <NFormItem label="Provider 编码" path="providerCode">
          <NInput v-model:value="model.providerCode" placeholder="请输入 Provider 编码，例如 volcengine-prod" />
        </NFormItem>
        <NFormItem label="Provider 名称" path="providerName">
          <NInput v-model:value="model.providerName" placeholder="请输入 Provider 名称" />
        </NFormItem>
        <NFormItem label="供应商" path="vendorCode">
          <DictSelect v-model:value="model.vendorCode" placeholder="请选择供应商" dict-code="xm_ai_vendor_code" />
        </NFormItem>
        <NFormItem label="鉴权类型" path="authType">
          <DictSelect v-model:value="model.authType" placeholder="请选择鉴权类型" dict-code="xm_ai_auth_type" />
        </NFormItem>
        <NFormItem label="请求地址" path="endpointUrl">
          <NInput v-model:value="model.endpointUrl" placeholder="请输入请求地址" />
        </NFormItem>
        <NFormItem label="应用 ID" path="appId">
          <NInput v-model:value="model.appId" placeholder="请输入应用 ID" />
        </NFormItem>
        <NFormItem label="API Key" path="apiKey">
          <NInput v-model:value="model.apiKey" :rows="3" type="textarea" placeholder="编辑时留空表示不修改" />
        </NFormItem>
        <NFormItem label="API Secret" path="apiSecret">
          <NInput v-model:value="model.apiSecret" :rows="3" type="textarea" placeholder="编辑时留空表示不修改" />
        </NFormItem>
        <NFormItem label="Access Token" path="accessToken">
          <NInput v-model:value="model.accessToken" :rows="3" type="textarea" placeholder="编辑时留空表示不修改" />
        </NFormItem>
        <NFormItem label="扩展鉴权配置 JSON" path="extraAuthJson">
          <NInput v-model:value="model.extraAuthJson" :rows="3" type="textarea" placeholder="请输入扩展鉴权配置 JSON" />
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
