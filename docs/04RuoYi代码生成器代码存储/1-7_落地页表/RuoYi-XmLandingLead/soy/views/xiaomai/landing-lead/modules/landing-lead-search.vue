<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'LandingLeadSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const dateRangeCreateTime = ref<[string, string] | null>(null);
const dateRangeUpdateTime = ref<[string, string] | null>(null);
const model = defineModel<Api.Xiaomai.LandingLeadSearchParams>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
  dateRangeCreateTime.value = null;
  dateRangeUpdateTime.value = null;
  Object.assign(model.value, defaultModel);
}

async function reset() {
  await restoreValidation();
  resetModel();
  emit('search');
}

async function search() {
  await validate();
  if (dateRangeCreateTime.value?.length) {
    model.value.params!.beginCreateTime = dateRangeCreateTime.value[0];
    model.value.params!.endCreateTime = dateRangeCreateTime.value[1];
  }
  if (dateRangeUpdateTime.value?.length) {
    model.value.params!.beginUpdateTime = dateRangeUpdateTime.value[0];
    model.value.params!.endUpdateTime = dateRangeUpdateTime.value[1];
  }
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="xiaomai-landing-lead-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="联系人姓名" label-width="auto" path="contactName" class="pr-24px">
              <NInput v-model:value="model.contactName" placeholder="请输入联系人姓名" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="机构 / 称呼" label-width="auto" path="organizationName" class="pr-24px">
              <NInput v-model:value="model.organizationName" placeholder="请输入机构 / 称呼" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="联系邮箱" label-width="auto" path="contactEmail" class="pr-24px">
              <NInput v-model:value="model.contactEmail" placeholder="请输入联系邮箱" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="咨询主题" label-width="auto" path="subject" class="pr-24px">
              <NInput v-model:value="model.subject" placeholder="请输入咨询主题" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="来源页面" label-width="auto" path="sourcePage" class="pr-24px">
              <NInput v-model:value="model.sourcePage" placeholder="请输入来源页面" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="提交语言" label-width="auto" path="sourceLocale" class="pr-24px">
              <DictSelect
                v-model:value="model.sourceLocale"
                placeholder="请选择提交语言"
                dict-code="sys_language"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="处理状态" label-width="auto" path="processingStatus" class="pr-24px">
              <DictSelect
                v-model:value="model.processingStatus"
                placeholder="请选择处理状态"
                dict-code="xm_landing_lead_status"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="创建时间" label-width="auto" path="createTime" class="pr-24px">
              <NDatePicker
                v-model:formatted-value="dateRangeCreateTime"
                type="datetimerange"
                value-format="yyyy-MM-dd HH:mm:ss"
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

<style scoped></style>
