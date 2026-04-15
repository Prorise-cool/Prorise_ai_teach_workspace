<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import {
  fetchCreateAiProvider,
  fetchUpdateAiProvider
} from '@/service/api/xiaomai/ai-provider';
import { fetchCreateAiResource } from '@/service/api/xiaomai/ai-resource';
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

// ==================== Resource 快速添加 ====================

interface QuickResource {
  capability: string;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  runtimeProviderId: string;
  modelName: string;
  voiceCode: string;
  languageCode: string;
  resourceSettingsJson: string;
  remark: string;
}

function createDefaultResource(): QuickResource {
  return {
    capability: 'llm',
    resourceCode: '',
    resourceName: '',
    resourceType: '',
    runtimeProviderId: '',
    modelName: '',
    voiceCode: '',
    languageCode: 'zh-CN',
    resourceSettingsJson: '',
    remark: ''
  };
}

const quickResources = ref<QuickResource[]>([]);
const showResourcesPanel = ref(false);

function addResource() {
  quickResources.value.push(createDefaultResource());
}

function removeResource(index: number) {
  quickResources.value.splice(index, 1);
}

/** 根据 capability 切换时清空不相关字段 */
function onCapabilityChange(res: QuickResource) {
  if (res.capability === 'llm') {
    res.voiceCode = '';
  } else {
    res.modelName = '';
    res.resourceType = 'voice';
  }
}

/** 自动填充：当 vendorCode 变化时，预填 resourceSettingsJson 模板 */
watch(
  () => model.value.vendorCode,
  vendor => {
    if (props.operateType !== 'add') return;
    quickResources.value.forEach(res => {
      if (res.resourceSettingsJson) return; // 用户已手动填写则不覆盖
      if (vendor === 'openai') {
        res.resourceSettingsJson = '{"temperature": 0.7, "providerType": "openai-compatible"}';
      } else if (vendor === 'deepseek') {
        res.resourceSettingsJson = '{"temperature": 0.2, "providerType": "openai-compatible"}';
      } else if (vendor === 'volcengine') {
        res.resourceSettingsJson = '{"providerType":"doubao-tts","cluster":"volcano_tts","encoding":"mp3","speed_ratio":1.0}';
      }
    });
  }
);

// ==================== 提交 ====================

function handleUpdateModelWhenEdit() {
  model.value = createDefaultModel();
  quickResources.value = [];
  showResourcesPanel.value = false;

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
    const { data: providerId, error } = await fetchCreateAiProvider(payload);
    if (error) return;

    // 批量创建关联 Resource
    if (quickResources.value.length > 0 && providerId) {
      let failCount = 0;
      for (const res of quickResources.value) {
        if (!res.resourceCode || !res.resourceName) continue; // 跳过空行
        const { error: resError } = await fetchCreateAiResource({
          id: null,
          providerId: providerId as unknown as number,
          capability: res.capability,
          resourceCode: res.resourceCode,
          resourceName: res.resourceName,
          resourceType: res.resourceType,
          runtimeProviderId: res.runtimeProviderId,
          modelName: res.modelName,
          voiceCode: res.voiceCode,
          languageCode: res.languageCode,
          resourceSettingsJson: res.resourceSettingsJson,
          status: '0',
          sortOrder: 0,
          remark: res.remark
        });
        if (resError) failCount++;
      }
      if (failCount > 0) {
        window.$message?.warning(`Provider 创建成功，但 ${failCount} 个资源创建失败，请到资源管理页补充`);
      } else {
        window.$message?.success(`Provider + ${quickResources.value.length} 个资源创建成功`);
      }
    } else {
      window.$message?.success($t('common.addSuccess'));
    }
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
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="800" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NGrid :x-gap="16" :cols="2" responsive="screen" item-responsive>
          <NFormItemGi span="2 m:1" label="Provider 编码" path="providerCode">
            <NInput v-model:value="model.providerCode" placeholder="如 volcengine-prod" />
          </NFormItemGi>
          <NFormItemGi span="2 m:1" label="Provider 名称" path="providerName">
            <NInput v-model:value="model.providerName" placeholder="如 火山引擎生产环境" />
          </NFormItemGi>
          <NFormItemGi span="2 m:1" label="供应商" path="vendorCode">
            <DictSelect v-model:value="model.vendorCode" placeholder="请选择供应商" dict-code="xm_ai_vendor_code" />
          </NFormItemGi>
          <NFormItemGi span="2 m:1" label="鉴权类型" path="authType">
            <DictSelect v-model:value="model.authType" placeholder="请选择鉴权类型" dict-code="xm_ai_auth_type" />
          </NFormItemGi>
        </NGrid>

        <NDivider title-placement="left" style="margin-top: 8px; margin-bottom: 8px">
          连接配置
        </NDivider>

        <NGrid :x-gap="16" :cols="1">
          <NFormItemGi label="请求地址" path="endpointUrl">
            <NInput v-model:value="model.endpointUrl" placeholder="https://api.deepseek.com" />
          </NFormItemGi>
          <NFormItemGi v-if="model.authType === 'api_key' || model.authType === ''" label="API Key" path="apiKey">
            <NInput v-model:value="model.apiKey" type="password" show-password-on="click" placeholder="编辑时留空表示不修改" />
          </NFormItemGi>
          <NFormItemGi v-if="model.authType === 'app_key_secret'" label="API Key" path="apiKey">
            <NInput v-model:value="model.apiKey" type="password" show-password-on="click" placeholder="编辑时留空表示不修改" />
          </NFormItemGi>
          <NFormItemGi v-if="model.authType === 'app_key_secret'" label="API Secret" path="apiSecret">
            <NInput v-model:value="model.apiSecret" type="password" show-password-on="click" placeholder="编辑时留空表示不修改" />
          </NFormItemGi>
          <NFormItemGi v-if="model.authType === 'access_token'" label="Access Token" path="accessToken">
            <NInput v-model:value="model.accessToken" type="password" show-password-on="click" placeholder="编辑时留空表示不修改" />
          </NFormItemGi>
          <NFormItemGi v-if="model.authType === 'custom'" label="扩展鉴权 JSON" path="extraAuthJson">
            <NInput v-model:value="model.extraAuthJson" :rows="3" type="textarea" placeholder="自定义鉴权配置 JSON" />
          </NFormItemGi>
          <NFormItemGi v-if="model.authType === 'api_key' || model.authType === 'app_key_secret'" label="应用 ID" path="appId">
            <NInput v-model:value="model.appId" placeholder="可选，部分供应商需要" />
          </NFormItemGi>
        </NGrid>

        <!-- 新增模式：快速添加资源 -->
        <template v-if="operateType === 'add'">
          <NDivider title-placement="left" style="margin-top: 16px; margin-bottom: 8px">
            <NSpace align="center" :size="8">
              <span>挂载资源</span>
              <NTag :bordered="false" size="small" type="info">可选</NTag>
            </NSpace>
          </NDivider>

          <NAlert type="info" :show-icon="true" style="margin-bottom: 12px">
            创建 Provider 后可立即挂载模型/音色资源，也可以之后在「AI 资源配置」页面单独添加。
          </NAlert>

          <NSpace vertical :size="12">
            <div v-for="(res, idx) in quickResources" :key="idx" style="border: 1px solid var(--n-border-color); border-radius: 8px; padding: 12px">
              <NSpace justify="space-between" align="center" style="margin-bottom: 8px">
                <NText strong>资源 #{{ idx + 1 }}</NText>
                <NButton text type="error" size="small" @click="removeResource(idx)">
                  移除
                </NButton>
              </NSpace>
              <NGrid :x-gap="12" :y-gap="4" :cols="2" responsive="screen" item-responsive>
                <NFormItemGi span="2 m:1" label="能力类型" :show-feedback="false">
                  <DictSelect
                    v-model:value="res.capability"
                    placeholder="LLM / TTS"
                    dict-code="xm_ai_capability"
                    @update:value="onCapabilityChange(res)"
                  />
                </NFormItemGi>
                <NFormItemGi span="2 m:1" label="资源类型" :show-feedback="false">
                  <DictSelect
                    v-model:value="res.resourceType"
                    :placeholder="res.capability === 'tts' ? 'voice' : 'chat/reasoning/vision'"
                    dict-code="xm_ai_resource_type"
                    clearable
                  />
                </NFormItemGi>
                <NFormItemGi span="2 m:1" label="资源编码" :show-feedback="false">
                  <NInput v-model:value="res.resourceCode" placeholder="如 deepseek-v3-chat" />
                </NFormItemGi>
                <NFormItemGi span="2 m:1" label="资源名称" :show-feedback="false">
                  <NInput v-model:value="res.resourceName" placeholder="如 DeepSeek V3 生成模型" />
                </NFormItemGi>
                <NFormItemGi v-if="res.capability === 'llm'" span="2 m:1" label="模型名称" :show-feedback="false">
                  <NInput v-model:value="res.modelName" placeholder="上游模型 ID，如 deepseek-chat" />
                </NFormItemGi>
                <NFormItemGi v-if="res.capability === 'tts'" span="2 m:1" label="音色编码" :show-feedback="false">
                  <NInput v-model:value="res.voiceCode" placeholder="如 BV001" />
                </NFormItemGi>
                <NFormItemGi span="2 m:1" label="运行时标识" :show-feedback="false">
                  <NInput v-model:value="res.runtimeProviderId" placeholder="FastAPI 运行时用，如 deepseek-chat" />
                </NFormItemGi>
                <NFormItemGi span="2 m:1" label="语言" :show-feedback="false">
                  <NInput v-model:value="res.languageCode" placeholder="zh-CN" />
                </NFormItemGi>
                <NFormItemGi span="2" label="扩展配置" :show-feedback="false">
                  <NInput v-model:value="res.resourceSettingsJson" :rows="2" type="textarea" placeholder='{"temperature": 0.7, "providerType": "openai-compatible"}' />
                </NFormItemGi>
              </NGrid>
            </div>

            <NButton dashed block @click="addResource">
              <template #icon>
                <icon-ic-round-plus />
              </template>
              添加资源
            </NButton>
          </NSpace>
        </template>

        <NDivider title-placement="left" style="margin-top: 16px; margin-bottom: 8px">
          其他
        </NDivider>

        <NGrid :x-gap="16" :cols="2" responsive="screen" item-responsive>
          <NFormItemGi span="2 m:1" label="状态" path="status">
            <DictRadio v-model:value="model.status" dict-code="sys_normal_disable" />
          </NFormItemGi>
          <NFormItemGi span="2 m:1" label="排序号" path="sortOrder">
            <NInputNumber v-model:value="model.sortOrder" placeholder="数字越小越靠前" class="w-full" />
          </NFormItemGi>
          <NFormItemGi span="2" label="备注" path="remark">
            <NInput v-model:value="model.remark" :rows="2" type="textarea" placeholder="备注信息" />
          </NFormItemGi>
        </NGrid>
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
