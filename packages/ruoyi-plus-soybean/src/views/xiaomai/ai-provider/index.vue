<script setup lang="tsx">
import { ref, h } from 'vue';
import { useRouter } from 'vue-router';
import { NDivider, NTag, NButton } from 'naive-ui';
import { fetchBatchDeleteAiProvider, fetchGetAiProviderList } from '@/service/api/xiaomai/ai-provider';
import { fetchGetAiResourceList } from '@/service/api/xiaomai/ai-resource';
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

const router = useRouter();
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

/** 每个 Provider 的资源数量缓存 */
const resourceCountMap = ref<Record<string, number>>({});

async function loadResourceCounts(providerIds: string[]) {
  if (providerIds.length === 0) return;
  // 并发查询每个 provider 的资源数
  const results = await Promise.allSettled(
    providerIds.map(pid =>
      fetchGetAiResourceList({ providerId: Number(pid), pageSize: 1 }).then(res => ({
        pid,
        total: res.data?.total ?? 0
      }))
    )
  );
  for (const r of results) {
    if (r.status === 'fulfilled') {
      resourceCountMap.value[r.value.pid] = r.value.total;
    }
  }
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: async () => {
      const res = await fetchGetAiProviderList(searchParams.value);
      const transformed = defaultTransform(res) as any;
      // 加载完数据后获取资源数
      if (transformed.data) {
        const ids = transformed.data.map((r: any) => String(r.id));
        loadResourceCounts(ids);
      }
      return transformed;
    },
    transform: response => response,
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
        key: 'providerName',
        title: '名称',
        align: 'center',
        minWidth: 140,
        render(row) {
          return (
            <div>
              <div style="font-weight:500">{row.providerName}</div>
              <div style="font-size:12px;color:#999">{row.providerCode}</div>
            </div>
          );
        }
      },
      {
        key: 'vendorCode',
        title: '供应商',
        align: 'center',
        minWidth: 100,
        render(row) {
          return <DictTag value={row.vendorCode} dictCode="xm_ai_vendor_code" />;
        }
      },
      {
        key: 'endpointUrl',
        title: '请求地址',
        align: 'center',
        minWidth: 200,
        ellipsis: { tooltip: true }
      },
      {
        key: 'resourceCount',
        title: '资源数',
        align: 'center',
        width: 100,
        render(row) {
          const count = resourceCountMap.value[String(row.id)];
          if (count === undefined) {
            return <NTag size="small" bordered={false}>-</NTag>;
          }
          return (
            <NButton
              text
              type={count > 0 ? 'primary' : 'default'}
              size="small"
              onClick={() => jumpToResources(row.id, row.providerName)}
            >
              {count} 个
            </NButton>
          );
        }
      },
      {
        key: 'status',
        title: '状态',
        align: 'center',
        width: 80,
        render(row) {
          return <DictTag value={row.status} dictCode="sys_normal_disable" />;
        }
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

/** 跳转到 AI 资源页面，按 providerId 过滤 */
function jumpToResources(providerId: number, providerName: string) {
  router.push({
    path: '/xiaomai/ai-resource',
    query: { providerId: String(providerId), providerName }
  });
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
