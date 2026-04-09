<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteAiResource, fetchGetAiResourceList } from '@/service/api/xiaomai/ai-resource';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import { $t } from '@/locales';
import AiResourceOperateDrawer from './modules/ai-resource-operate-drawer.vue';
import AiResourceSearch from './modules/ai-resource-search.vue';

defineOptions({
  name: 'AiResourceList'
});

useDict('xm_ai_capability');
useDict('xm_ai_resource_type');
useDict('sys_normal_disable');

const appStore = useAppStore();
const { download } = useDownload();
const { hasAuth } = useAuth();

const searchParams = ref<Api.Xiaomai.AiResourceSearchParams>({
  pageNum: 1,
  pageSize: 10,
  providerId: null,
  capability: null,
  resourceCode: null,
  resourceName: null,
  resourceType: null,
  runtimeProviderId: null,
  modelName: null,
  voiceCode: null,
  languageCode: null,
  resourceSettingsJson: null,
  status: null,
  sortOrder: null,
  params: {}
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiResourceList(searchParams.value),
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
        key: 'providerId',
        title: 'Provider 主键',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'capability',
        title: '能力类型',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.capability} dictCode="xm_ai_capability" />;
        }
      },
      {
        key: 'resourceCode',
        title: '资源编码',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'resourceName',
        title: '资源名称',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'resourceType',
        title: '资源类型',
        align: 'center',
        minWidth: 140,
        render(row) {
          return <DictTag value={row.resourceType} dictCode="xm_ai_resource_type" />;
        }
      },
      {
        key: 'runtimeProviderId',
        title: '运行时 Provider ID',
        align: 'center',
        minWidth: 220
      },
      {
        key: 'modelName',
        title: '模型名称',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'voiceCode',
        title: '音色编码',
        align: 'center',
        minWidth: 140
      },
      {
        key: 'languageCode',
        title: '语言编码',
        align: 'center',
        minWidth: 120
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
            if (!hasAuth('xiaomai:aiResource:edit') || !hasAuth('xiaomai:aiResource:remove')) {
              return null;
            }
            return <NDivider vertical />;
          };

          const editBtn = () => {
            if (!hasAuth('xiaomai:aiResource:edit')) {
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
            if (!hasAuth('xiaomai:aiResource:remove')) {
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
  const { error } = await fetchBatchDeleteAiResource(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteAiResource([id]);
  if (error) return;
  onDeleted();
}

function edit(id: CommonType.IdType) {
  handleEdit(id);
}

function handleExport() {
  download('/xiaomai/aiResource/export', searchParams.value, `AI_Resource_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiResourceSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard title="AI 资源列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('xiaomai:aiResource:add')"
          :show-delete="hasAuth('xiaomai:aiResource:remove')"
          :show-export="hasAuth('xiaomai:aiResource:export')"
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
      <AiResourceOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>
