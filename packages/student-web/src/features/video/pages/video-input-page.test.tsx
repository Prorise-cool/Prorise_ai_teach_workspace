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
import {
	resetAuthSessionStore,
	useAuthSessionStore
} from '@/stores/auth-session-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

const createTaskMock = vi.fn();
const preprocessImageMock = vi.fn();

vi.mock('@/services/api/adapters/video-task-adapter', () => ({
	resolveVideoTaskAdapter: () => ({
		createTask: createTaskMock,
	}),
}));

vi.mock('@/services/api/adapters/video-preprocess-adapter', () => ({
	resolveVideoPreprocessAdapter: () => ({
		preprocessImage: preprocessImageMock,
	}),
}));

vi.mock('@/features/video/hooks/use-public-videos', () => ({
	usePublicVideos: vi.fn(),
}));

const usePublicVideosMock = vi.mocked(usePublicVideos);

/**
 * 构造视频输入页路由。
 *
 * @returns 内存路由实例。
 */
function createVideoRouter() {
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
		],
		{
			initialEntries: ['/video/input']
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

describe('VideoInputPage', () => {
	beforeEach(() => {
		resetAuthSessionStore();
		window.localStorage.clear();
		window.sessionStorage.clear();
		createTaskMock.mockReset();
		preprocessImageMock.mockReset();
		usePublicVideosMock.mockReset();
		createTaskMock.mockResolvedValue({
			taskId: 'vtask_test_001',
			taskType: 'video',
			status: 'pending',
			createdAt: '2026-04-06T12:00:00Z'
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
		usePublicVideosMock.mockReturnValue(createPublicVideosQueryResult());
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

		expect(screen.getByText('Video Engine')).toBeInTheDocument();
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

		expect(screen.getByText('热门题目讲解视频')).toBeInTheDocument();
		expect(screen.getByText('洛必达法则的完整推导')).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: '查看讲解' })).toHaveLength(6);
		expect(screen.getAllByRole('button', { name: '复用题目' })).toHaveLength(6);

		expect(screen.getAllByRole('article')).toHaveLength(6);
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

		render(
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>,
		);

		expect(screen.getAllByRole('article')).toHaveLength(6);
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
			expect(screen.getByText(/请输入至少 10 个字符/)).toBeInTheDocument();
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
			expect(router.state.location.pathname).toBe('/video/vtask_test_001/generating');
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
		expect(screen.getByText(/请输入至少 10 个字符/)).toBeInTheDocument();

		const file = new File(['binary'], 'algebra.png', { type: 'image/png' });
		const uploadInput = screen
			.getAllByLabelText(/上传图片/)
			.find((element) => element.tagName === 'INPUT') as HTMLInputElement;

		await user.upload(uploadInput, file);

		await waitFor(() => {
			expect(screen.queryByText(/请输入至少 10 个字符/)).not.toBeInTheDocument();
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
			expect(router.state.location.pathname).toBe('/video/video_public_lhopital');
		});
	});
});
