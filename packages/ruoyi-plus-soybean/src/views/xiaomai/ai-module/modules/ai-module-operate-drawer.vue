<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateAiModule, fetchUpdateAiModule } from '@/service/api/xiaomai/ai-module';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'AiModuleOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Xiaomai.AiModule | null;
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
    add: '新增 AI 配置模块',
    edit: '编辑 AI 配置模块'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.AiModuleOperateParams;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    id: null,
    moduleCode: '',
    moduleName: '',
    status: '0',
    sortOrder: 0,
    remark: ''
  };
}

type RuleKey = Extract<keyof Model, 'moduleCode' | 'moduleName' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  moduleCode: createRequiredRule('模块编码不能为空'),
  moduleName: createRequiredRule('模块名称不能为空'),
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
    moduleCode: model.value.moduleCode,
    moduleName: model.value.moduleName,
    status: model.value.status,
    sortOrder: model.value.sortOrder,
    remark: model.value.remark
  };

  if (props.operateType === 'add') {
    const { error } = await fetchCreateAiModule(payload);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateAiModule(payload);
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
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="720" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem label="模块编码" path="moduleCode">
          <NInput v-model:value="model.moduleCode" placeholder="请输入模块编码，例如 video / classroom / companion" />
        </NFormItem>
        <NFormItem label="模块名称" path="moduleName">
          <NInput v-model:value="model.moduleName" placeholder="请输入模块名称" />
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
