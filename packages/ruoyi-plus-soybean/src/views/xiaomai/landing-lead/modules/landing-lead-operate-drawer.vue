<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { useLoading } from '@sa/hooks';
import {
  fetchCreateLandingLead,
  fetchGetLandingLeadDetail,
  fetchUpdateLandingLead
} from '@/service/api/xiaomai/landing-lead';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'LandingLeadOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.Xiaomai.LandingLead | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { loading, startLoading, endLoading } = useLoading();
const { formRef, validate, restoreValidation } = useNaiveForm();
const { createRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增营销落地页线索',
    edit: '编辑营销落地页线索'
  };
  return titles[props.operateType];
});

type Model = Api.Xiaomai.LandingLeadOperateParams;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    id: null,
    contactName: '',
    organizationName: '',
    contactEmail: '',
    subject: '',
    message: '',
    sourceLocale: '',
    processingStatus: '',
    remark: ''
  };
}

type RuleKey = Extract<
  keyof Model,
  'contactName' | 'contactEmail' | 'subject' | 'message' | 'sourceLocale' | 'processingStatus'
>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  contactName: createRequiredRule('联系人姓名不能为空'),
  contactEmail: createRequiredRule('联系邮箱不能为空'),
  subject: createRequiredRule('咨询主题不能为空'),
  message: createRequiredRule('留言内容不能为空'),
  sourceLocale: createRequiredRule('提交语言不能为空'),
  processingStatus: createRequiredRule('处理状态不能为空')
};

function handleUpdateModelWhenEdit() {
  model.value = createDefaultModel();

  if (props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
  }
}

async function getLandingLeadDetail(id: CommonType.IdType) {
  startLoading();
  const { error, data } = await fetchGetLandingLeadDetail(id);
  if (!error && data) {
    Object.assign(model.value, jsonClone(data));
  }
  endLoading();
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const { id, contactName, organizationName, contactEmail, subject, message, sourceLocale, processingStatus, remark } =
    model.value;

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateLandingLead({
      contactName,
      organizationName,
      contactEmail,
      subject,
      message,
      sourceLocale,
      processingStatus,
      remark
    });
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateLandingLead({
      id,
      contactName,
      organizationName,
      contactEmail,
      subject,
      message,
      sourceLocale,
      processingStatus,
      remark
    });
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }

  closeDrawer();
  emit('submitted');
}

watch(visible, () => {
  if (visible.value) {
    handleUpdateModelWhenEdit();

    if (props.operateType === 'edit' && props.rowData?.id) {
      getLandingLeadDetail(props.rowData.id);
    }

    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="800" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model" :rules="rules">
          <NFormItem label="联系人姓名" path="contactName">
            <NInput v-model:value="model.contactName" placeholder="请输入联系人姓名" />
          </NFormItem>
          <NFormItem label="机构 / 称呼" path="organizationName">
            <NInput v-model:value="model.organizationName" placeholder="请输入机构 / 称呼" />
          </NFormItem>
          <NFormItem label="联系邮箱" path="contactEmail">
            <NInput v-model:value="model.contactEmail" placeholder="请输入联系邮箱" />
          </NFormItem>
          <NFormItem label="咨询主题" path="subject">
            <NInput v-model:value="model.subject" placeholder="请输入咨询主题" />
          </NFormItem>
          <NFormItem label="留言内容" path="message">
            <NInput v-model:value="model.message" :rows="3" type="textarea" placeholder="请输入留言内容" />
          </NFormItem>
          <NFormItem label="提交语言" path="sourceLocale">
            <DictSelect
              v-model:value="model.sourceLocale"
              placeholder="请选择提交语言"
              dict-code="sys_language"
              clearable
            />
          </NFormItem>
          <NFormItem label="处理状态" path="processingStatus">
            <DictRadio
              v-model:value="model.processingStatus"
              placeholder="请选择处理状态"
              dict-code="xm_landing_lead_status"
              clearable
            />
          </NFormItem>
          <NFormItem label="后台备注" path="remark">
            <NInput v-model:value="model.remark" :rows="3" type="textarea" placeholder="请输入后台备注" />
          </NFormItem>
        </NForm>
      </NSpin>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
