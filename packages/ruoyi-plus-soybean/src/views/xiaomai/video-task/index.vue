<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteVideoTask, fetchGetVideoTaskList } from '@/service/api/xiaomai/video-task';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import VideoTaskOperateDrawer from './modules/video-task-operate-drawer.vue';
import VideoTaskSearch from './modules/video-task-search.vue';

defineOptions({
  name: 'VideoTaskList'
});

useDict('xm_task_status');

const appStore = useAppStore();
const { download } = useDownload();
const { hasAuth } = useAuth();

const searchParams = ref<Api.Xiaomai.VideoTaskSearchParams>({
  pageNum: 1,
  pageSize: 10,
  taskId: null,
  userId: null,
  taskType: null,
  taskState: null,
  summary: null,
  resultRef: null,
  detailRef: null,
  errorSummary: null,
  sourceSessionId: null,
  sourceArtifactRef: null,
  replayHint: null,
  params: {}
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetVideoTaskList(searchParams.value),
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
        key: 'id',
        title: '主键',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'taskId',
        title: '任务ID',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'userId',
        title: '用户ID（关联 sys_user.user_id）',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'taskType',
        title: '任务类型',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'taskState',
        title: '任务状态',
        align: 'center',
        minWidth: 120,
        render(row) {
          return <DictTag value={row.taskState} dictCode="xm_task_status" />;
        }
      },
      {
        key: 'summary',
        title: '任务摘要',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'resultRef',
        title: '结果资源标识',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'detailRef',
        title: '结果详情标识',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'errorSummary',
        title: '失败摘要',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'sourceSessionId',
        title: '来源会话ID',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'sourceArtifactRef',
        title: '来源产物引用',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'replayHint',
        title: '回看定位提示',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'startTime',
        title: '开始时间',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'completeTime',
        title: '完成时间',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'failTime',
        title: '失败时间',
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
            if (!hasAuth('video:task:edit') || !hasAuth('video:task:remove')) {
              return null;
            }
            return <NDivider vertical />;
          };

          const editBtn = () => {
            if (!hasAuth('video:task:edit')) {
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
            if (!hasAuth('video:task:remove')) {
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
  const { error } = await fetchBatchDeleteVideoTask(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  // request
  const { error } = await fetchBatchDeleteVideoTask([id]);
  if (error) return;
  onDeleted();
}

function edit(id: CommonType.IdType) {
  handleEdit(id);
}

function handleExport() {
  download('/video/task/export', searchParams.value, `视频任务_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <VideoTaskSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard title="视频任务列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('video:task:add')"
          :show-delete="hasAuth('video:task:remove')"
          :show-export="hasAuth('video:task:export')"
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
      <VideoTaskOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
