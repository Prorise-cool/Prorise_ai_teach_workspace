<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteLandingLead, fetchGetLandingLeadList } from '@/service/api/xiaomai/landing-lead';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import LandingLeadOperateDrawer from './modules/landing-lead-operate-drawer.vue';
import LandingLeadSearch from './modules/landing-lead-search.vue';

defineOptions({
  name: 'LandingLeadList'
});

useDict('xm_landing_lead_status');
useDict('sys_language');

const appStore = useAppStore();
const { download } = useDownload();
const { hasAuth } = useAuth();

const searchParams = ref<Api.Xiaomai.LandingLeadSearchParams>({
  pageNum: 1,
  pageSize: 10,
  contactName: null,
  organizationName: null,
  contactEmail: null,
  subject: null,
  sourcePage: null,
  sourceLocale: null,
  processingStatus: null,
  params: {}
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetLandingLeadList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.pageNum = params.page;
      searchParams.value.pageSize = params.pageSize;
    },
    columns: () => [
      {
        type: 'selection',
        align: 'center',
        width: 48
      },
      {
        key: 'index',
        title: $t('common.index'),
        align: 'center',
        width: 64,
        render: (_, index) => index + 1
      },
      {
        key: 'contactName',
        title: '联系人姓名',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'organizationName',
        title: '机构 / 称呼',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'contactEmail',
        title: '联系邮箱',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'subject',
        title: '咨询主题',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'sourcePage',
        title: '来源页面',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'sourceLocale',
        title: '提交语言',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.sourceLocale} dictCode="sys_language" />;
        }
      },
      {
        key: 'processingStatus',
        title: '处理状态',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.processingStatus} dictCode="xm_landing_lead_status" />;
        }
      },
      {
        key: 'createTime',
        title: '创建时间',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'updateTime',
        title: '更新时间',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 130,
        render: row => {
          const divider = () => {
            if (!hasAuth('xiaomai:landingLead:edit') || !hasAuth('xiaomai:landingLead:remove')) {
              return null;
            }
            return <NDivider vertical />;
          };

          const editBtn = () => {
            if (!hasAuth('xiaomai:landingLead:edit')) {
              return null;
            }
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:drive-file-rename-outline-outline"
                tooltipContent={$t('common.edit')}
                onClick={() => edit(row.id)}
              />
            );
          };

          const deleteBtn = () => {
            if (!hasAuth('xiaomai:landingLead:remove')) {
              return null;
            }
            return (
              <ButtonIcon
                text
                type="error"
                icon="material-symbols:delete-outline"
                tooltipContent={$t('common.delete')}
                popconfirmContent={$t('common.confirmDelete')}
                onPositiveClick={() => handleDelete(row.id)}
              />
            );
          };

          return (
            <div class="flex-center gap-8px">
              {editBtn()}
              {divider()}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, checkedRowKeys, onBatchDeleted, onDeleted } =
  useTableOperate(data, 'id', getData);

async function handleBatchDelete() {
  // request
  const { error } = await fetchBatchDeleteLandingLead(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  // request
  const { error } = await fetchBatchDeleteLandingLead([id]);
  if (error) return;
  onDeleted();
}

function edit(id: CommonType.IdType) {
  handleEdit(id);
}

function handleExport() {
  download('/xiaomai/landingLead/export', searchParams.value, `营销落地页线索_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <LandingLeadSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard title="营销落地页线索列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('xiaomai:landingLead:add')"
          :show-delete="hasAuth('xiaomai:landingLead:remove')"
          :show-export="hasAuth('xiaomai:landingLead:export')"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @export="handleExport"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <LandingLeadOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>
