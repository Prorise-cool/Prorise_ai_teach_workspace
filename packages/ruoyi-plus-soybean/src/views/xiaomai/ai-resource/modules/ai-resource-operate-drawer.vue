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
  vendorCode: string;
  endpointUrl: string;
}
const providerOptions = ref<ProviderOption[]>([]);

async function loadProviderOptions() {
  const { data, error } = await fetchGetAiProviderList({ pageSize: 200, status: '0' });
  if (!error && data) {
    providerOptions.value = (data.rows || []).map((item: any) => ({
      id: item.id,
      label: `${item.providerName} (${item.providerCode})`,
      vendorCode: item.vendorCode,
      endpointUrl: item.endpointUrl
    }));
  }
}

onMounted(() => {
  loadProviderOptions();
});

/** 当前选中的 Provider 信息 */
const selectedProvider = computed(() => {
  if (!model.value.providerId) return null;
  return providerOptions.value.find(o => o.id === model.value.providerId) || null;
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
    languageCode: 'zh-CN',
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
  providerId: createRequiredRule('请选择 Provider'),
  capability: createRequiredRule('能力类型不能为空'),
  resourceCode: createRequiredRule('资源编码不能为空'),
  resourceName: createRequiredRule('资源名称不能为空'),
  runtimeProviderId: createRequiredRule('运行时标识不能为空'),
  status: createRequiredRule('状态不能为空')
};

/** 能力切换时：清不相关字段，调整 resourceType 默认值 */
function onCapabilityChange(val: string) {
  if (val === 'llm') {
    model.value.voiceCode = '';
    if (!model.value.resourceType) {
      model.value.resourceType = 'chat';
    }
  } else if (val === 'tts') {
    model.value.modelName = '';
    model.value.resourceType = 'voice';
  }
  // 切换后自动填 settings 模板
  autoFillSettings();
}

/** 选了 Provider 后根据 vendor 自动填 settings 模板 */
function onProviderChange() {
  autoFillSettings();
}

/** 根据 vendor + capability 自动填 settings JSON */
function autoFillSettings() {
  if (props.operateType === 'edit') return; // 编辑不覆盖
  const vendor = selectedProvider.value?.vendorCode;
  if (!vendor) return;

  if (model.value.capability === 'tts') {
    if (vendor === 'volcengine') {
      model.value.resourceSettingsJson = '{"providerType":"doubao-tts","cluster":"volcano_tts","encoding":"mp3","speed_ratio":1.0,"volume_ratio":1.0,"pitch_ratio":1.0}';
    } else {
      model.value.resourceSettingsJson = '{"providerType":"openai-tts"}';
    }
  } else {
    if (vendor === 'openai') {
      model.value.resourceSettingsJson = '{"temperature":0.7,"providerType":"openai-compatible"}';
    } else if (vendor === 'deepseek') {
      model.value.resourceSettingsJson = '{"temperature":0.2,"providerType":"openai-compatible"}';
    } else {
      model.value.resourceSettingsJson = '{"providerType":"openai-compatible"}';
    }
  }
}

/** settings JSON 的表单控件 */
const settingsModel = ref({
  providerType: 'openai-compatible',
  temperature: 0.7,
  cluster: '',
  encoding: 'mp3',
  speedRatio: 1.0,
  volumeRatio: 1.0,
  pitchRatio: 1.0
});

/** 从 JSON 解析到表单控件 */
function parseSettingsJson(json: string) {
  try {
    const obj = JSON.parse(json || '{}');
    settingsModel.value = {
      providerType: obj.providerType || 'openai-compatible',
      temperature: obj.temperature ?? 0.7,
      cluster: obj.cluster || '',
      encoding: obj.encoding || 'mp3',
      speedRatio: obj.speed_ratio ?? 1.0,
      volumeRatio: obj.volume_ratio ?? 1.0,
      pitchRatio: obj.pitch_ratio ?? 1.0
    };
  } catch {
    // JSON 解析失败就不管了，保留原始
  }
}

/** 从表单控件序列化回 JSON */
function serializeSettings() {
  if (model.value.capability === 'tts') {
    const obj: Record<string, any> = {
      providerType: settingsModel.value.providerType
    };
    if (settingsModel.value.cluster) obj.cluster = settingsModel.value.cluster;
    obj.encoding = settingsModel.value.encoding;
    obj.speed_ratio = settingsModel.value.speedRatio;
    obj.volume_ratio = settingsModel.value.volumeRatio;
    obj.pitch_ratio = settingsModel.value.pitchRatio;
    return JSON.stringify(obj);
  }
  const obj: Record<string, any> = {
    temperature: settingsModel.value.temperature,
    providerType: settingsModel.value.providerType
  };
  return JSON.stringify(obj);
}

/** 是否显示原始 JSON 编辑器（高级用户） */
const showRawJson = ref(false);

/** 监听 settingsModel 变化 → 回写 JSON */
watch(
  settingsModel,
  () => {
    if (!showRawJson.value) {
      model.value.resourceSettingsJson = serializeSettings();
    }
  },
  { deep: true }
);

/** 监听 JSON 字段变化 → 解析到表单控件（原始模式） */
watch(
  () => model.value.resourceSettingsJson,
  json => {
    if (showRawJson.value) {
      parseSettingsJson(json);
    }
  }
);

/** 当自动填充 settings JSON 后，同步到表单控件 */
watch(
  () => model.value.resourceSettingsJson,
  json => {
    if (json) parseSettingsJson(json);
  },
  { immediate: true }
);

function handleUpdateModelWhenEdit() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
    if (model.value.resourceSettingsJson) {
      parseSettingsJson(model.value.resourceSettingsJson);
    }
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  // 提交前确保 JSON 是最新的
  if (!showRawJson.value) {
    model.value.resourceSettingsJson = serializeSettings();
  }

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
    loadProviderOptions();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="760" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NGrid :x-gap="16" :cols="2" responsive="screen" item-responsive>
          <!-- Provider 选择 -->
          <NFormItemGi span="2" label="所属 Provider" path="providerId">
            <NSelect
              v-model:value="model.providerId"
              :options="providerOptions.map(o => ({ label: o.label, value: o.id }))"
              placeholder="请选择 Provider（连接凭证）"
              filterable
              @update:value="onProviderChange"
            />
          </NFormItemGi>

          <!-- 当前 Provider 信息提示 -->
          <NFormItemGi v-if="selectedProvider" span="2" :show-label="false" :show-feedback="false">
            <NAlert type="info" :show-icon="true" style="width:100%">
              供应商: <strong>{{ selectedProvider.vendorCode }}</strong> | 端点: {{ selectedProvider.endpointUrl }}
            </NAlert>
          </NFormItemGi>

          <!-- 能力类型 -->
          <NFormItemGi span="2 m:1" label="能力类型" path="capability">
            <DictSelect
              v-model:value="model.capability"
              placeholder="LLM / TTS"
              dict-code="xm_ai_capability"
              @update:value="onCapabilityChange"
            />
          </NFormItemGi>

          <!-- 资源类型 -->
          <NFormItemGi span="2 m:1" label="资源类型">
            <DictSelect
              v-model:value="model.resourceType"
              :placeholder="model.capability === 'tts' ? 'voice' : 'chat / reasoning / vision'"
              dict-code="xm_ai_resource_type"
              clearable
            />
          </NFormItemGi>

          <NFormItemGi span="2 m:1" label="资源编码" path="resourceCode">
            <NInput v-model:value="model.resourceCode" placeholder="如 deepseek-v3-chat" />
          </NFormItemGi>
          <NFormItemGi span="2 m:1" label="资源名称" path="resourceName">
            <NInput v-model:value="model.resourceName" placeholder="如 DeepSeek V3 生成模型" />
          </NFormItemGi>
        </NGrid>

        <NDivider title-placement="left" style="margin-top: 8px; margin-bottom: 8px">
          {{ model.capability === 'tts' ? '音色配置' : '模型配置' }}
        </NDivider>

        <NGrid :x-gap="16" :cols="2" responsive="screen" item-responsive>
          <!-- LLM 模型名 -->
          <NFormItemGi v-if="model.capability === 'llm'" span="2 m:1" label="模型名称">
            <NInput v-model:value="model.modelName" placeholder="上游模型 ID，如 deepseek-chat" />
          </NFormItemGi>
          <!-- TTS 音色编码 -->
          <NFormItemGi v-if="model.capability === 'tts'" span="2 m:1" label="音色编码">
            <NInput v-model:value="model.voiceCode" placeholder="如 BV001 或 zh-CN-YunxiNeural" />
          </NFormItemGi>

          <NFormItemGi span="2 m:1" label="运行时标识" path="runtimeProviderId">
            <NInput v-model:value="model.runtimeProviderId" placeholder="FastAPI 用，如 deepseek-chat">
              <template #prefix>
                <NText depth="3" style="font-size:12px">ID:</NText>
              </template>
            </NInput>
          </NFormItemGi>

          <NFormItemGi span="2 m:1" label="语言编码">
            <NSelect
              v-model:value="model.languageCode"
              :options="[
                { label: '中文 (zh-CN)', value: 'zh-CN' },
                { label: '英文 (en-US)', value: 'en-US' },
                { label: '日文 (ja-JP)', value: 'ja-JP' }
              ]"
              placeholder="选择语言"
            />
          </NFormItemGi>
        </NGrid>

        <!-- Settings 配置 -->
        <NDivider title-placement="left" style="margin-top: 8px; margin-bottom: 8px">
          <NSpace align="center" :size="8">
            <span>扩展配置</span>
            <NButton text size="tiny" type="primary" @click="showRawJson = !showRawJson">
              {{ showRawJson ? '表单模式' : 'JSON 模式' }}
            </NButton>
          </NSpace>
        </NDivider>

        <!-- 表单模式 -->
        <template v-if="!showRawJson">
          <NGrid :x-gap="16" :cols="2" responsive="screen" item-responsive>
            <NFormItemGi span="2 m:1" label="Provider 类型">
              <NSelect
                v-model:value="settingsModel.providerType"
                :options="[
                  { label: 'OpenAI Compatible', value: 'openai-compatible' },
                  { label: 'Doubao TTS', value: 'doubao-tts' },
                  { label: 'OpenAI TTS', value: 'openai-tts' }
                ]"
              />
            </NFormItemGi>

            <template v-if="model.capability === 'llm'">
              <NFormItemGi span="2 m:1" label="Temperature">
                <NSlider v-model:value="settingsModel.temperature" :min="0" :max="2" :step="0.1" />
              </NFormItemGi>
            </template>

            <template v-if="model.capability === 'tts'">
              <NFormItemGi span="2 m:1" label="Cluster">
                <NInput v-model:value="settingsModel.cluster" placeholder="如 volcano_tts" />
              </NFormItemGi>
              <NFormItemGi span="2 m:1" label="编码格式">
                <NSelect
                  v-model:value="settingsModel.encoding"
                  :options="[
                    { label: 'MP3', value: 'mp3' },
                    { label: 'WAV', value: 'wav' },
                    { label: 'OGG', value: 'ogg' }
                  ]"
                />
              </NFormItemGi>
              <NFormItemGi span="2 m:1" label="语速">
                <NSlider v-model:value="settingsModel.speedRatio" :min="0.5" :max="2" :step="0.1" />
              </NFormItemGi>
              <NFormItemGi span="2 m:1" label="音量">
                <NSlider v-model:value="settingsModel.volumeRatio" :min="0.5" :max="2" :step="0.1" />
              </NFormItemGi>
            </template>
          </NGrid>
        </template>

        <!-- JSON 原始模式 -->
        <NFormItem v-else label="JSON" path="resourceSettingsJson">
          <NInput
            v-model:value="model.resourceSettingsJson"
            :rows="4"
            type="textarea"
            placeholder='{"temperature": 0.7, "providerType": "openai-compatible"}'
          />
        </NFormItem>

        <!-- 其他 -->
        <NDivider title-placement="left" style="margin-top: 8px; margin-bottom: 8px">
          其他
        </NDivider>

        <NGrid :x-gap="16" :cols="2" responsive="screen" item-responsive>
          <NFormItemGi span="2 m:1" label="状态" path="status">
            <DictRadio v-model:value="model.status" dict-code="sys_normal_disable" />
          </NFormItemGi>
          <NFormItemGi span="2 m:1" label="排序号">
            <NInputNumber v-model:value="model.sortOrder" placeholder="数字越小越靠前" class="w-full" />
          </NFormItemGi>
          <NFormItemGi span="2" label="备注">
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
