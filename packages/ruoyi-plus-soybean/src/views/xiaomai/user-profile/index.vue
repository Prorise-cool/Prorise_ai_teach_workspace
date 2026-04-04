<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteUserProfile, fetchGetUserProfileList } from '@/service/api/xiaomai/user-profile';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import UserProfileOperateDrawer from './modules/user-profile-operate-drawer.vue';
import UserProfileSearch from './modules/user-profile-search.vue';
import { useDict } from '@/hooks/business/dict';

defineOptions({
  name: 'UserProfileList'
});

useDict('sys_yes_no');
useDict('user_personality_type');
useDict('sys_language');

const appStore = useAppStore();
const { download } = useDownload();
const { hasAuth } = useAuth();

const searchParams = ref<Api.Xiaomai.UserProfileSearchParams>({
  pageNum: 1,
  pageSize: 10,
  id: null,
  userId: null,
  bio: null,
  personalityType: null,
  language: null,
  isCompleted: null,
  params: {}
});

function normalizeTeacherTags(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string');
    }
  } catch {
    // ignore invalid JSON and fall back to plain string matching
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
  api: () => fetchGetUserProfileList(searchParams.value),
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
      key: 'userId',
      title: '用户ID',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'avatarUrl',
      title: '头像URL',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'bio',
      title: '个人简介',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'personalityType',
      title: '性格类型',
      align: 'center',
      minWidth: 120,
      render(row) {
        return <DictTag value={row.personalityType} dictCode="user_personality_type" />;
      }
    },
    {
      key: 'teacherTags',
      title: 'AI导师偏好',
      align: 'center',
      minWidth: 120,
      render(row) {
        return <DictTag value={normalizeTeacherTags(row.teacherTags)} dictCode="user_teacher_tag" />;
      }
    },
    {
      key: 'language',
      title: '语言偏好',
      align: 'center',
      minWidth: 120,
      render(row) {
        return <DictTag value={row.language} dictCode="sys_language" />;
      }
    },
    {
      key: 'isCompleted',
      title: '是否完成配置',
      align: 'center',
      minWidth: 120,
      render(row) {
        return <DictTag value={row.isCompleted} dictCode="sys_yes_no" />;
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
          if (!hasAuth('xiaomai:userProfile:edit') || !hasAuth('xiaomai:userProfile:remove')) {
            return null;
          }
          return <NDivider vertical />;
        };

        const editBtn = () => {
          if (!hasAuth('xiaomai:userProfile:edit')) {
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
          if (!hasAuth('xiaomai:userProfile:remove')) {
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
  const { error } = await fetchBatchDeleteUserProfile(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  // request
  const { error } = await fetchBatchDeleteUserProfile([id]);
  if (error) return;
  onDeleted();
}

function edit(id: CommonType.IdType) {
  handleEdit(id);
}

function handleExport() {
  download('/xiaomai/userProfile/export', searchParams.value, `用户配置_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <UserProfileSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard title="用户配置列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('xiaomai:userProfile:add')"
          :show-delete="hasAuth('xiaomai:userProfile:remove')"
          :show-export="hasAuth('xiaomai:userProfile:export')"
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
      <UserProfileOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
