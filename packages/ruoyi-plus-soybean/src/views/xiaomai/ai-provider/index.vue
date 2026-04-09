<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteAiProvider, fetchGetAiProviderList } from '@/service/api/xiaomai/ai-provider';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import { $t } from '@/locales';
import AiProviderOperateDrawer from './modules/ai-provider-operate-drawer.vue';
import AiProviderSearch from './modules/ai-provider-search.vue';

defineOptions({
  name: 'AiProviderList'
});

useDict('xm_ai_vendor_code');
useDict('xm_ai_auth_type');
useDict('sys_normal_disable');

const appStore = useAppStore();
const { download } = useDownload();
const { hasAuth } = useAuth();

const searchParams = ref<Api.Xiaomai.AiProviderSearchParams>({
  pageNum: 1,
  pageSize: 10,
  providerCode: null,
  providerName: null,
  vendorCode: null,
  authType: null,
  endpointUrl: null,
  appId: null,
  extraAuthJson: null,
  status: null,
  sortOrder: null,
  params: {}
});

function maskSecret(value?: string | null) {
  if (!value) return '-';
  return value;
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiProviderList(searchParams.value),
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
        key: 'providerCode',
        title: 'Provider 编码',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'providerName',
        title: 'Provider 名称',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'vendorCode',
        title: '供应商',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.vendorCode} dictCode="xm_ai_vendor_code" />;
        }
      },
      {
        key: 'authType',
        title: '鉴权类型',
        align: 'center',
        minWidth: 140,
        render(row) {
          return <DictTag value={row.authType} dictCode="xm_ai_auth_type" />;
        }
      },
      {
        key: 'endpointUrl',
        title: '请求地址',
        align: 'center',
        minWidth: 220
      },
      {
        key: 'appId',
        title: '应用 ID',
        align: 'center',
        minWidth: 140
      },
      {
        key: 'apiKey',
        title: 'API Key',
        align: 'center',
        minWidth: 180,
        render(row) {
          return maskSecret(row.apiKey);
        }
      },
      {
        key: 'apiSecret',
        title: 'API Secret',
        align: 'center',
        minWidth: 180,
        render(row) {
          return maskSecret(row.apiSecret);
        }
      },
      {
        key: 'accessToken',
        title: 'Access Token',
        align: 'center',
        minWidth: 180,
        render(row) {
          return maskSecret(row.accessToken);
        }
      },
      {
        key: 'status',
        title: '状态',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.status} dictCode="sys_normal_disable" />;
        }
      },
      {
        key: 'sortOrder',
        title: '排序号',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'remark',
        title: '备注',
        align: 'center',
        minWidth: 180
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 130,
        render: row => {
          const divider = () => {
            if (!hasAuth('xiaomai:aiProvider:edit') || !hasAuth('xiaomai:aiProvider:remove')) {
              return null;
            }
            return <NDivider vertical />;
          };

          const editBtn = () => {
            if (!hasAuth('xiaomai:aiProvider:edit')) {
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
            if (!hasAuth('xiaomai:aiProvider:remove')) {
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
  const { error } = await fetchBatchDeleteAiProvider(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteAiProvider([id]);
  if (error) return;
  onDeleted();
}

function edit(id: CommonType.IdType) {
  handleEdit(id);
}

function handleExport() {
  download('/xiaomai/aiProvider/export', searchParams.value, `AI_Provider_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiProviderSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard title="AI Provider 列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('xiaomai:aiProvider:add')"
          :show-delete="hasAuth('xiaomai:aiProvider:remove')"
          :show-export="hasAuth('xiaomai:aiProvider:export')"
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
      <AiProviderOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>
