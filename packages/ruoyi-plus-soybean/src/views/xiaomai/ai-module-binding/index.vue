<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteAiModuleBinding, fetchGetAiModuleBindingList } from '@/service/api/xiaomai/ai-module-binding';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import { $t } from '@/locales';
import AiModuleBindingOperateDrawer from './modules/ai-module-binding-operate-drawer.vue';
import AiModuleBindingSearch from './modules/ai-module-binding-search.vue';

defineOptions({
  name: 'AiModuleBindingList'
});

useDict('xm_ai_capability');
useDict('xm_ai_health_source');
useDict('sys_normal_disable');
useDict('sys_yes_no');

const appStore = useAppStore();
const { download } = useDownload();
const { hasAuth } = useAuth();

const searchParams = ref<Api.Xiaomai.AiModuleBindingSearchParams>({
  pageNum: 1,
  pageSize: 10,
  moduleId: null,
  stageCode: null,
  capability: null,
  roleCode: null,
  resourceId: null,
  priority: null,
  timeoutSeconds: null,
  retryAttempts: null,
  healthSource: null,
  runtimeSettingsJson: null,
  status: null,
  isDefault: null,
  params: {}
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiModuleBindingList(searchParams.value),
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
        key: 'moduleId',
        title: '模块主键',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'stageCode',
        title: '阶段编码',
        align: 'center',
        minWidth: 160
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
        key: 'roleCode',
        title: '角色编码',
        align: 'center',
        minWidth: 140
      },
      {
        key: 'resourceId',
        title: '资源主键',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'priority',
        title: '优先级',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'timeoutSeconds',
        title: '超时秒数',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'retryAttempts',
        title: '重试次数',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'healthSource',
        title: '健康来源',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.healthSource} dictCode="xm_ai_health_source" />;
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
        key: 'isDefault',
        title: '默认链路',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.isDefault} dictCode="sys_yes_no" />;
        }
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
            if (!hasAuth('xiaomai:aiModuleBinding:edit') || !hasAuth('xiaomai:aiModuleBinding:remove')) {
              return null;
            }
            return <NDivider vertical />;
          };

          const editBtn = () => {
            if (!hasAuth('xiaomai:aiModuleBinding:edit')) {
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
            if (!hasAuth('xiaomai:aiModuleBinding:remove')) {
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
  const { error } = await fetchBatchDeleteAiModuleBinding(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteAiModuleBinding([id]);
  if (error) return;
  onDeleted();
}

function edit(id: CommonType.IdType) {
  handleEdit(id);
}

function handleExport() {
  download('/xiaomai/aiModuleBinding/export', searchParams.value, `AI_Module_Binding_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiModuleBindingSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard title="AI 模块绑定列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('xiaomai:aiModuleBinding:add')"
          :show-delete="hasAuth('xiaomai:aiModuleBinding:remove')"
          :show-export="hasAuth('xiaomai:aiModuleBinding:export')"
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
      <AiModuleBindingOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>
