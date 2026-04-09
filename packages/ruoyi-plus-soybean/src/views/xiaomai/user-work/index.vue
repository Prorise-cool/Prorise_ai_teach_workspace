<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteUserWork, fetchGetUserWorkList } from '@/service/api/xiaomai/user-work';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import { $t } from '@/locales';
import UserWorkOperateDrawer from './modules/user-work-operate-drawer.vue';
import UserWorkSearch from './modules/user-work-search.vue';

defineOptions({
  name: 'UserWorkList'
});

useDict('xm_user_work_type');
useDict('xm_yes_no_numeric');
useDict('xm_user_work_status');

const appStore = useAppStore();
const { download } = useDownload();
const { hasAuth } = useAuth();

const searchParams = ref<Api.Xiaomai.UserWorkSearchParams>({
  pageNum: 1,
  pageSize: 10,
  userId: null,
  workType: null,
  taskRefId: null,
  title: null,
  description: null,
  coverOssId: null,
  coverUrl: null,
  isPublic: null,
  status: null,
  viewCount: null,
  likeCount: null,
  params: {}
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetUserWorkList(searchParams.value),
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
        key: 'userId',
        title: '用户 ID',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'workType',
        title: '作品类型',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.workType} dictCode="xm_user_work_type" />;
        }
      },
      {
        key: 'taskRefId',
        title: '来源任务 ID',
        align: 'center',
        minWidth: 180
      },
      {
        key: 'title',
        title: '作品标题',
        align: 'center',
        minWidth: 180
      },
      {
        key: 'coverUrl',
        title: '封面地址',
        align: 'center',
        minWidth: 220
      },
      {
        key: 'isPublic',
        title: '公开状态',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.isPublic} dictCode="xm_yes_no_numeric" />;
        }
      },
      {
        key: 'status',
        title: '管理状态',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.status} dictCode="xm_user_work_status" />;
        }
      },
      {
        key: 'viewCount',
        title: '浏览量',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'likeCount',
        title: '点赞量',
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
            if (!hasAuth('xiaomai:userWork:edit') || !hasAuth('xiaomai:userWork:remove')) {
              return null;
            }
            return <NDivider vertical />;
          };

          const editBtn = () => {
            if (!hasAuth('xiaomai:userWork:edit')) {
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
            if (!hasAuth('xiaomai:userWork:remove')) {
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
  const { error } = await fetchBatchDeleteUserWork(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteUserWork([id]);
  if (error) return;
  onDeleted();
}

function edit(id: CommonType.IdType) {
  handleEdit(id);
}

function handleExport() {
  download('/xiaomai/userWork/export', searchParams.value, `User_Work_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <UserWorkSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard title="用户作品列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('xiaomai:userWork:add')"
          :show-delete="hasAuth('xiaomai:userWork:remove')"
          :show-export="hasAuth('xiaomai:userWork:export')"
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
      <UserWorkOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>
