import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VideoInputShell } from '@/features/video/video-input-shell';
import type {
  TaskLaunchMode,
  TaskLaunchPreviewResponse,
  TaskLaunchRequest
} from '@/services/task-launcher';
import { useAuthStore } from '@/stores/auth-store';
import { createAuthSession } from '@/test/helpers/auth-fixtures';
import { renderWithMemoryRouter } from '@/test/helpers/router';

const taskLauncherMocks = vi.hoisted(() => ({
  createTaskPreviewMock: vi.fn(
    (
      _mode: TaskLaunchMode,
      payload: TaskLaunchRequest
    ): Promise<TaskLaunchPreviewResponse> =>
      Promise.resolve({
        table_name: 'xm_video_task',
        task: {
          task_id: payload.task_id,
          user_id: payload.user_id,
          task_type: 'video',
          summary: payload.summary
        },
        ruoyi_payload: {
          agent_config: payload.agent_config
        }
      })
  )
}));

vi.mock('@/services/task-launcher', async () => {
  const actual = await vi.importActual<typeof import('@/services/task-launcher')>(
    '@/services/task-launcher'
  );

  return {
    ...actual,
    createTaskPreview: taskLauncherMocks.createTaskPreviewMock
  };
});

describe('VideoInputShell', () => {
  it('shows the default agent style, supports switching, and keeps agentConfig in the preview payload', async () => {
    const user = userEvent.setup();

    useAuthStore.setState({
      session: createAuthSession()
    });

    renderWithMemoryRouter(<VideoInputShell />);

    expect(screen.getByLabelText('老师风格')).toHaveValue('patient');

    await user.selectOptions(screen.getByLabelText('老师风格'), 'efficient');

    expect(screen.getByLabelText('老师风格')).toHaveValue('efficient');

    await user.type(
      screen.getByLabelText('题目描述'),
      '请帮我讲清楚牛顿第二定律在受力分析里的应用。'
    );
    await user.click(
      screen.getByRole('button', { name: '创建单题视频请求预览' })
    );

    await waitFor(() => {
      expect(taskLauncherMocks.createTaskPreviewMock).toHaveBeenCalled();
    });

    const previewPayload = taskLauncherMocks.createTaskPreviewMock.mock.calls[0]?.[1];
    if (!previewPayload) {
      throw new Error('缺少任务预览请求参数');
    }

    expect(previewPayload.agent_config).toMatchObject({
      key: 'efficient'
    });
    expect(await screen.findByText(/"key":"efficient"/)).toBeInTheDocument();
  });
});
