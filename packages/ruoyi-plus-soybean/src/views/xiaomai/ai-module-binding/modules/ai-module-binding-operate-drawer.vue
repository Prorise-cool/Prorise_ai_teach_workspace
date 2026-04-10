<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateAiModuleBinding, fetchUpdateAiModuleBinding } from '@/service/api/xiaomai/ai-module-binding';
import { fetchGetAiModuleList } from '@/service/api/xiaomai/ai-module';
import { fetchGetAiResourceList } from '@/service/api/xiaomai/ai-resource';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'AiModuleBindingOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Xiaomai.AiModuleBinding | null;
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

/** 模块下拉选项 */
interface ModuleOption {
  id: number;
  label: string;
  moduleCode: string;
}
const moduleOptions = ref<ModuleOption[]>([]);

/** 资源下拉选项 */
interface ResourceOption {
  id: number;
  label: string;
  capability: string;
  providerId: number;
  modelName: string;
}
const resourceOptions = ref<ResourceOption[]>([]);

/** 根据能力类型过滤的资源选项 */
const filteredResourceOptions = computed(() => {
  if (!model.value.capability) return resourceOptions.value;
  return resourceOptions.value.filter(r => r.capability === model.value.capability);
});

async function loadModuleOptions() {
  const { data, error } = await fetchGetAiModuleList({ pageSize: 100 });
  if (!error && data) {
    moduleOptions.value = (data.rows || []).map((item: any) => ({
      id: item.id,
      label: `${item.moduleName} (${item.moduleCode})`,
      moduleCode: item.moduleCode
    }));
  }
}

async function loadResourceOptions() {
  const { data, error } = await fetchGetAiResourceList({ pageSize: 100 });
  if (!error && data) {
    resourceOptions.value = (data.rows || []).map((item: any) => ({
      id: item.id,
      label: `${item.resourceName} — ${item.modelName || item.voiceCode || ''} (ID:${item.id})`,
      capability: item.capability,
      providerId: item.providerId,
      modelName: item.modelName
    }));
  }
}

onMounted(() => {
  loadModuleOptions();
  loadResourceOptions();
});

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增 AI 模块绑定',
    edit: '编辑 AI 模块绑定'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.AiModuleBindingOperateParams;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    id: null,
    moduleId: null,
    stageCode: '',
    capability: 'llm',
    roleCode: '',
    resourceId: null,
    priority: 100,
    timeoutSeconds: 30,
    retryAttempts: 0,
    healthSource: 'ruoyi',
    runtimeSettingsJson: '',
    status: '0',
    isDefault: 'N',
    remark: ''
  };
}

type RuleKey = Extract<
  keyof Model,
  'moduleId' | 'stageCode' | 'capability' | 'resourceId' | 'healthSource' | 'status' | 'isDefault'
>;
const rules: Record<RuleKey, App.Global.FormRule> = {
  moduleId: createRequiredRule('请选择模块'),
  stageCode: createRequiredRule('阶段编码不能为空'),
  capability: createRequiredRule('能力类型不能为空'),
  resourceId: createRequiredRule('请选择资源'),
  healthSource: createRequiredRule('健康来源不能为空'),
  status: createRequiredRule('状态不能为空'),
  isDefault: createRequiredRule('默认链路不能为空')
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
    moduleId: model.value.moduleId,
    stageCode: model.value.stageCode,
    capability: model.value.capability,
    roleCode: model.value.roleCode,
    resourceId: model.value.resourceId,
    priority: model.value.priority,
    timeoutSeconds: model.value.timeoutSeconds,
    retryAttempts: model.value.retryAttempts,
    healthSource: model.value.healthSource,
    runtimeSettingsJson: model.value.runtimeSettingsJson,
    status: model.value.status,
    isDefault: model.value.isDefault,
    remark: model.value.remark
  };

  if (props.operateType === 'add') {
    const { error } = await fetchCreateAiModuleBinding(payload);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateAiModuleBinding(payload);
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
        <NFormItem label="模块" path="moduleId">
          <NSelect
            v-model:value="model.moduleId"
            :options="moduleOptions.map(o => ({ label: o.label, value: o.id }))"
            placeholder="请选择模块"
            filterable
          />
        </NFormItem>
        <NFormItem label="阶段编码" path="stageCode">
          <NInput v-model:value="model.stageCode" placeholder="请输入阶段编码，例如 storyboard / narration / search" />
        </NFormItem>
        <NFormItem label="能力类型" path="capability">
          <DictSelect v-model:value="model.capability" placeholder="请选择能力类型" dict-code="xm_ai_capability" />
        </NFormItem>
        <NFormItem label="角色编码" path="roleCode">
          <NInput v-model:value="model.roleCode" placeholder="为空表示阶段默认链路" />
        </NFormItem>
        <NFormItem label="资源" path="resourceId">
          <NSelect
            v-model:value="model.resourceId"
            :options="filteredResourceOptions.map(o => ({ label: o.label, value: o.id }))"
            placeholder="请选择资源（按能力类型过滤）"
            filterable
          />
        </NFormItem>
        <NFormItem label="优先级" path="priority">
          <NInputNumber v-model:value="model.priority" placeholder="请输入优先级，越小越优先" class="w-full" />
        </NFormItem>
        <NFormItem label="超时秒数" path="timeoutSeconds">
          <NInputNumber v-model:value="model.timeoutSeconds" placeholder="请输入超时秒数" class="w-full" />
        </NFormItem>
        <NFormItem label="重试次数" path="retryAttempts">
          <NInputNumber v-model:value="model.retryAttempts" placeholder="请输入重试次数" class="w-full" />
        </NFormItem>
        <NFormItem label="健康来源" path="healthSource">
          <DictSelect v-model:value="model.healthSource" placeholder="请选择健康来源" dict-code="xm_ai_health_source" />
        </NFormItem>
        <NFormItem label="运行时配置 JSON" path="runtimeSettingsJson">
          <NInput
            v-model:value="model.runtimeSettingsJson"
            :rows="3"
            type="textarea"
            placeholder="请输入运行时配置 JSON"
          />
        </NFormItem>
        <NFormItem label="状态" path="status">
          <DictRadio v-model:value="model.status" dict-code="sys_normal_disable" />
        </NFormItem>
        <NFormItem label="默认链路" path="isDefault">
          <DictRadio v-model:value="model.isDefault" dict-code="sys_yes_no" />
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
