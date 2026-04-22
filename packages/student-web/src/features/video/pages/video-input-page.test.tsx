/**
 * 文件说明：验证视频输入页正确渲染共享组件、视频专属输入卡片与社区瀑布流。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '@/app/provider/app-provider';
import { usePublicVideos } from '@/features/video/hooks/use-public-videos';
import { VideoInputPage } from '@/features/video/pages/video-input-page';
import { createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService } from '@/services/auth';
import { getMockVideoPublicListSuccess } from '@/services/mock/fixtures/video-public';
import { getMockVideoResult } from '@/services/mock/fixtures/video-pipeline';
import {
	resetAuthSessionStore,
	useAuthSessionStore
} from '@/stores/auth-session-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

const createTaskMock = vi.fn();
const cancelTaskMock = vi.fn();
const deleteTaskMock = vi.fn();
const getVideoResultMock = vi.fn();
const preprocessImageMock = vi.fn();
const useVideoWorkspaceTasksMock = vi.fn();

vi.mock('@/services/api/adapters/video-task-adapter', () => ({
	resolveVideoTaskAdapter: () => ({
		createTask: createTaskMock,
		cancelTask: cancelTaskMock,
		deleteTask: deleteTaskMock,
	}),
}));

vi.mock('@/services/api/adapters/video-preprocess-adapter', () => ({
	resolveVideoPreprocessAdapter: () => ({
		preprocessImage: preprocessImageMock,
	}),
}));

vi.mock('@/services/api/adapters/video-result-adapter', () => ({
	resolveVideoResultAdapter: () => ({
		getResult: getVideoResultMock,
	}),
}));

vi.mock('@/features/video/hooks/use-public-videos', () => ({
	usePublicVideos: vi.fn(),
}));

vi.mock('@/features/video/hooks/use-video-workspace-tasks', () => ({
	useVideoWorkspaceTasks: () => useVideoWorkspaceTasksMock(),
}));

const usePublicVideosMock = vi.mocked(usePublicVideos);

/**
 * 构造视频输入页路由。
 *
 * @returns 内存路由实例。
 */
function createVideoRouter(initialEntries: string[] = ['/video/input']) {
	return createMemoryRouter(
		[
			{
				path: '/video/input',
				element: <VideoInputPage />
			},
			{
				path: '/video/:id/generating',
				element: <div>生成中</div>,
			},
			{
				path: '/video/:id',
				element: <div>视频结果页</div>,
			},
			{
				path: '/video/public/:id',
				element: <div>公开视频结果页</div>,
			},
		],
		{
			initialEntries
		}
	);
}

function createPublicVideosQueryResult(
	overrides: Partial<ReturnType<typeof usePublicVideos>> = {},
) {
	return {
		data: getMockVideoPublicListSuccess('default').data,
		isLoading: false,
		isError: false,
		...overrides,
	} as ReturnType<typeof usePublicVideos>;
}

function createWorkspaceTasksQueryResult(
	overrides: Record<string, unknown> = {},
) {
	return {
		data: undefined,
		isLoading: false,
		isFetching: false,
		isError: false,
		refetch: vi.fn(),
		...overrides,
	};
}

describe('VideoInputPage', () => {
	beforeEach(() => {
		resetAuthSessionStore();
		window.localStorage.clear();
		window.sessionStorage.clear();
		createTaskMock.mockReset();
		cancelTaskMock.mockReset();
		deleteTaskMock.mockReset();
		getVideoResultMock.mockReset();
		preprocessImageMock.mockReset();
		usePublicVideosMock.mockReset();
		useVideoWorkspaceTasksMock.mockReset();
		createTaskMock.mockResolvedValue({
			taskId: 'vtask_test_001',
			taskType: 'video',
			status: 'pending',
			createdAt: '2026-04-06T12:00:00Z'
		});
		cancelTaskMock.mockResolvedValue({
			taskId: 'vtask_processing_002',
			requestId: 'req_cancel_001',
			taskType: 'video',
			status: 'cancelled',
			progress: 12,
			message: '任务已取消',
			timestamp: '2026-04-17T12:00:00Z',
			errorCode: 'TASK_CANCELLED',
		});
		preprocessImageMock.mockResolvedValue({
			imageRef: 'local://20260406/test-image.png',
			ocrText: '一道图片题',
			confidence: 0.91,
			width: 1200,
			height: 800,
			format: 'png',
			suggestions: [],
			errorCode: null
		});
		getVideoResultMock.mockImplementation(async (taskId: string) => ({
			taskId,
			status: 'completed',
			result: {
				...getMockVideoResult(taskId),
				published: false,
			},
			failure: null,
		}));
		usePublicVideosMock.mockReturnValue(createPublicVideosQueryResult());
		useVideoWorkspaceTasksMock.mockReturnValue(createWorkspaceTasksQueryResult());
	});

	it('renders the header with badge and gradient title', async () => {
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		expect(screen.getByText('输入或拍题，')).toBeInTheDocument();
		expect(screen.getByText(/5分钟生成动画讲解/)).toBeInTheDocument();
	});

	it('renders the submit button and suggestion pills', async () => {
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		expect(
			screen.getByRole('button', { name: /生成视频/ })
		).toBeInTheDocument();
		expect(screen.getByText('证明洛必达法则')).toBeInTheDocument();
	});

	it('renders three guide cards', async () => {
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		expect(screen.getByText('没找到合适讲解？')).toBeInTheDocument();
		expect(screen.getByText('登录后看更多')).toBeInTheDocument();
		expect(screen.getByText('网络不稳也能继续')).toBeInTheDocument();
	});

	it('renders the public video feed with at least 6 cards', async () => {
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		expect(
			screen.getByRole('tab', { name: /我的题目/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('tab', { name: /热门题目讲解视频/i }),
		).toBeInTheDocument();
		expect(screen.getByText('洛必达法则的完整推导')).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: '查看讲解' })).toHaveLength(6);
		expect(screen.getAllByRole('button', { name: '复用题目' })).toHaveLength(6);

		expect(screen.getAllByRole('article')).toHaveLength(6);
	});

	it('keeps public cards compact and hides long summary text', async () => {
		usePublicVideosMock.mockReturnValue(
			createPublicVideosQueryResult({
				data: {
					...getMockVideoPublicListSuccess('default').data,
					items: getMockVideoPublicListSuccess('default').data.items.map((item, index) =>
						index === 0
							? {
								...item,
								summary: '这是一段不应该直接显示在卡片里的超长总结文本，用来确保卡片不会再因为 summary 被撑高。',
							}
							: item,
					),
				},
			}),
		);

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(
			screen.queryByText('这是一段不应该直接显示在卡片里的超长总结文本，用来确保卡片不会再因为 summary 被撑高。'),
		).not.toBeInTheDocument();
	});

	it('renders completed tasks in the private tab and can switch back to public videos', async () => {
		const user = userEvent.setup();
		useVideoWorkspaceTasksMock.mockReturnValue(
			createWorkspaceTasksQueryResult({
				data: {
					items: [
						{
							taskId: 'vtask_completed_private_001',
							title: '导数定义题',
							lifecycleStatus: 'completed',
							progress: 100,
							stageLabel: 'video.stages.completed',
							currentStage: 'completed',
							message: '视频已生成完成',
							updatedAt: '2026-04-19T09:30:00Z',
						},
					],
				},
			}),
		);
		getVideoResultMock.mockResolvedValue({
			taskId: 'vtask_completed_private_001',
			status: 'completed',
			result: {
				...getMockVideoResult('vtask_completed_private_001'),
				title: '导数定义的动画直觉',
				published: true,
			},
			failure: null,
		});

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(
			screen.getByRole('tab', { name: /我的题目/i }),
		).toBeInTheDocument();
		expect(screen.getByText('仅用户自己可见')).toBeInTheDocument();
		expect(screen.queryByText('你的私有视频会显示在这里')).not.toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText('导数定义的动画直觉')).toBeInTheDocument();
		});

		expect(screen.getByText('已公开')).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: '查看结果：导数定义的动画直觉' }),
		).toHaveAttribute('href', '/video/vtask_completed_private_001');
		expect(screen.queryByText('洛必达法则的完整推导')).not.toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: /热门题目讲解视频/i }));

		expect(screen.getByText('洛必达法则的完整推导')).toBeInTheDocument();
		expect(screen.queryByText('导数定义的动画直觉')).not.toBeInTheDocument();
	});

	it('does not render backend-only fields in community cards', async () => {
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		const { container } = render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		expect(container.textContent).not.toContain('status');
		expect(container.textContent).not.toContain('tenant_id');
	});

	it('公开视频为空时展示空态', async () => {
		usePublicVideosMock.mockReturnValue(
			createPublicVideosQueryResult({
				data: getMockVideoPublicListSuccess('empty').data,
			}),
		);

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(screen.getByText('暂无公开视频，快来创建第一个')).toBeInTheDocument();
		expect(
			screen.getByText('公开发现区为空时，不会影响你继续输入题目并直接生成新视频。'),
		).toBeInTheDocument();
	});

	it('公开视频加载失败时展示降级提示且输入区仍可用', async () => {
		const user = userEvent.setup();
		usePublicVideosMock.mockReturnValue(
			createPublicVideosQueryResult({
				data: undefined,
				isError: true,
			}),
		);

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(screen.getByText('公开视频暂时不可用')).toBeInTheDocument();
		await user.type(
			screen.getByPlaceholderText(/粘贴题目文本/),
			'即使推荐区报错，也应该允许我继续提交题目。',
		);
		expect(
			screen.getByDisplayValue('即使推荐区报错，也应该允许我继续提交题目。'),
		).toBeInTheDocument();
	});

	it('加载公开视频时展示骨架屏', async () => {
		usePublicVideosMock.mockReturnValue(
			createPublicVideosQueryResult({
				data: undefined,
				isLoading: true,
			}),
		);

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		const { container } = render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(
			container.querySelectorAll('.xm-video-discovery__card--skeleton'),
		).toHaveLength(6);
		expect(screen.queryByText('洛必达法则的完整推导')).not.toBeInTheDocument();
	});

	it('空输入提交时展示 inline 错误提示', async () => {
		const user = userEvent.setup();

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		await user.click(screen.getByRole('button', { name: /生成视频/ }));

		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
			expect(screen.getByText(/请输入至少 5 个字符/)).toBeInTheDocument();
		});
	});

	it('文本输入后创建成功并跳转到 generating 页', async () => {
		const user = userEvent.setup();

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		await user.type(
			screen.getByPlaceholderText(/粘贴题目文本/),
			'证明洛必达法则为什么成立，请给出完整推导。'
		);
		await user.click(screen.getByRole('button', { name: /生成视频/ }));

		await waitFor(() => {
			expect(createTaskMock).toHaveBeenCalledTimes(1);
			expect(createTaskMock).toHaveBeenCalledWith(
				expect.objectContaining({
					inputType: 'text',
					sourcePayload: {
						text: '证明洛必达法则为什么成立，请给出完整推导。',
					},
					userProfile: {
						durationMinutes: 3,
						sectionCount: 4,
						sectionConcurrency: 2,
						layoutHint: 'center_stage',
						renderQuality: 'm',
					},
					clientRequestId: expect.stringMatching(/^video_/),
				}),
			);
			expect(router.state.location.pathname).toBe('/video/vtask_test_001/generating');
		});
	});

	it('高级参数会随质量预设与手动调整一起传给创建接口', async () => {
		const user = userEvent.setup();

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		await user.type(
			screen.getByPlaceholderText(/粘贴题目文本/),
			'请用动画方式讲解导数的几何意义，并强调切线逼近的过程。'
		);
		await user.click(screen.getByLabelText('高级参数'));
		await user.click(screen.getByRole('option', { name: /高质细讲/ }));
		await user.clear(screen.getByLabelText('目标时长（分钟）'));
		await user.type(screen.getByLabelText('目标时长（分钟）'), '4');
		await user.clear(screen.getByLabelText('分段数量'));
		await user.type(screen.getByLabelText('分段数量'), '6');
		await user.clear(screen.getByLabelText('并发生成数'));
		await user.type(screen.getByLabelText('并发生成数'), '1');
		await user.click(screen.getByRole('button', { name: '高质精修' }));
		await user.click(screen.getByRole('button', { name: '双栏讲解' }));
		await user.click(screen.getByRole('button', { name: '完成设置' }));
		await user.click(screen.getByRole('button', { name: /生成视频/ }));

		await waitFor(() => {
			expect(createTaskMock).toHaveBeenCalledTimes(1);
			expect(createTaskMock).toHaveBeenCalledWith(
				expect.objectContaining({
					inputType: 'text',
					sourcePayload: {
						text: '请用动画方式讲解导数的几何意义，并强调切线逼近的过程。',
					},
					userProfile: {
						durationMinutes: 4,
						sectionCount: 6,
						sectionConcurrency: 1,
						layoutHint: 'two_column',
						renderQuality: 'h',
					},
					clientRequestId: expect.stringMatching(/^video_/),
				}),
			);
		});
	});

	it('图片输入会先调用 preprocess 再调用 create task', async () => {
		const user = userEvent.setup();

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		const file = new File(['binary'], 'geometry.png', { type: 'image/png' });
		const uploadInput = screen
			.getAllByLabelText(/上传图片/)
			.find((element) => element.tagName === 'INPUT') as HTMLInputElement;

		await user.upload(
			uploadInput,
			file
		);
		await user.click(screen.getByRole('button', { name: /生成视频/ }));

		await waitFor(() => {
			expect(preprocessImageMock).toHaveBeenCalledWith(file);
			expect(createTaskMock).toHaveBeenCalledTimes(1);
		});
	});

	it('上传图片后会清掉文本模式遗留的 inline 错误', async () => {
		const user = userEvent.setup();

		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123'
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		);

		await user.click(screen.getByRole('button', { name: /生成视频/ }));
		expect(screen.getByText(/请输入至少 5 个字符/)).toBeInTheDocument();

		const file = new File(['binary'], 'algebra.png', { type: 'image/png' });
		const uploadInput = screen
			.getAllByLabelText(/上传图片/)
			.find((element) => element.tagName === 'INPUT') as HTMLInputElement;

		await user.upload(uploadInput, file);

		await waitFor(() => {
			expect(screen.queryByText(/请输入至少 5 个字符/)).not.toBeInTheDocument();
			expect(screen.getByText('algebra.png')).toBeInTheDocument();
		});
	});

	it('点击复用题目会把 sourceText 回填到 textarea', async () => {
		const user = userEvent.setup();
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		await user.click(screen.getAllByRole('button', { name: '复用题目' })[0]);

		expect(
			screen.getByDisplayValue('请证明洛必达法则为什么成立，并给出完整推导过程。'),
		).toBeInTheDocument();
		expect(screen.getByText('已复用题目到输入区')).toBeInTheDocument();
	});

	it('点击查看讲解会导航到对应视频结果页', async () => {
		const user = userEvent.setup();
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		await user.click(screen.getAllByRole('link', { name: '查看讲解' })[0]);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe('/video/public/video_public_lhopital');
		});
	});

	it('有活跃任务时会在顶栏渲染任务中心并支持进入与取消', async () => {
		const user = userEvent.setup();
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useVideoWorkspaceTasksMock.mockReturnValue(
			createWorkspaceTasksQueryResult({
				data: {
					total: 2,
					items: [
						{
							taskId: 'vtask_processing_002',
							title: '积分题讲解',
							lifecycleStatus: 'processing',
							progress: 58,
							stageLabel: 'video.stages.render',
							currentStage: 'render',
							message: '渲染第 2 段中',
							updatedAt: '2026-04-17 10:05:00',
						},
						{
							taskId: 'vtask_pending_001',
							title: '导数题讲解',
							lifecycleStatus: 'pending',
							progress: 0,
							stageLabel: null,
							currentStage: null,
							message: '等待进入队列',
							updatedAt: '2026-04-17 10:00:00',
						},
					],
				},
			}),
		);
		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(screen.getByText('输入或拍题，')).toBeInTheDocument();
		expect(
			screen.queryByText('进行中的任务'),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole('button', { name: '查看进行中的任务' }),
		);

		expect(screen.getByText('进行中的任务')).toBeInTheDocument();
		expect(screen.getAllByText('积分题讲解').length).toBeGreaterThan(0);
		expect(screen.getAllByText('导数题讲解').length).toBeGreaterThan(0);
		expect(screen.getAllByText('渲染中').length).toBeGreaterThan(0);
		expect(screen.getByText('排队中')).toBeInTheDocument();
		expect(screen.getAllByText('58%').length).toBeGreaterThan(0);

		await user.click(
			screen.getByRole('button', { name: '取消任务 导数题讲解' }),
		);

		await waitFor(() => {
			expect(cancelTaskMock).toHaveBeenCalledWith('vtask_pending_001');
		});

		await user.click(
			screen.getByRole('button', { name: '进入任务 积分题讲解' }),
		);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe('/video/vtask_processing_002/generating');
		});
	});

	it('没有活跃任务时 bell 不显示红点，但仍可打开空态任务中心', async () => {
		const user = userEvent.setup();
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter();

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(
			screen.queryByTestId('video-task-center-indicator'),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole('button', { name: '查看进行中的任务' }),
		);

		expect(screen.getByText('暂无进行中的任务')).toBeInTheDocument();
	});

	it('返回输入页后不展示内嵌任务卡，仅顶栏铃铛可访问任务并弹出 toast', async () => {
		const user = userEvent.setup();
		const session = await mockAuthService.login({
			username: 'admin',
			password: 'admin123',
		});

		useVideoWorkspaceTasksMock.mockReturnValue(
			createWorkspaceTasksQueryResult({
				data: {
					total: 2,
					items: [
						{
							taskId: 'vtask_processing_002',
							title: '积分题讲解',
							lifecycleStatus: 'processing',
							progress: 58,
							stageLabel: 'video.stages.render',
							currentStage: 'render',
							message: '渲染第 2 段中',
							updatedAt: '2026-04-17 10:05:00',
						},
						{
							taskId: 'vtask_pending_001',
							title: '导数题讲解',
							lifecycleStatus: 'pending',
							progress: 0,
							stageLabel: null,
							currentStage: null,
							message: '等待进入队列',
							updatedAt: '2026-04-17 10:00:00',
						},
					],
				},
			}),
		);

		useAuthSessionStore.getState().setSession(session);
		const router = createVideoRouter([
			'/video/input?focusTask=vtask_processing_002&toast=returned',
		]);

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(
			screen.queryByText('当前任务'),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole('button', { name: '查看进行中的任务' }),
		);

		expect(screen.getAllByText('积分题讲解').length).toBeGreaterThan(0);

		await user.click(
			screen.getByRole('button', { name: '进入任务 积分题讲解' }),
		);

		await waitFor(() => {
			expect(router.state.location.pathname).toBe('/video/vtask_processing_002/generating');
		});
	});
});
