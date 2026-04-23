/**
 * 文件说明：应用路由表。
 * 统一定义页面级懒加载策略，确保业务页面按路由切分 chunk。
 */
import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/app/layouts/app-shell';
import { RequireAuthRoute } from '@/features/auth/components/require-auth-route';

/**
 * 按需加载首页路由模块，确保首页以独立 chunk 输出。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadHomeRoute() {
	const { HomePage } = await import('@/features/home/pages/home-page');

	return {
		Component: HomePage
	};
}

/**
 * 按需加载公开落地页，确保营销页独立分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadLandingRoute() {
	const { LandingPage } = await import('@/features/home/pages/landing-page');

	return {
		Component: LandingPage
	};
}

/**
 * 按需加载认证页路由模块，确保登录页单独分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadLoginRoute() {
	const { LoginPage } = await import('@/features/auth/pages/login-page');

	return {
		Component: LoginPage
	};
}

/**
 * 按需加载第三方登录回调页，确保认证扩展流程单独分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadSocialCallbackRoute() {
	const { SocialCallbackPage } = await import(
		'@/features/auth/pages/social-callback-page'
	);

	return {
		Component: SocialCallbackPage
	};
}

/**
 * 按需加载权限不足页，确保认证异常分支独立分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadForbiddenRoute() {
	const { ForbiddenPage } = await import('@/features/auth/pages/forbidden-page');

	return {
		Component: ForbiddenPage
	};
}

/**
 * 按需加载学习中心聚合页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadLearningCenterRoute() {
	const { LearningCenterPage } = await import(
		'@/features/learning-center/pages/learning-center-page'
	);

	return {
		Component: LearningCenterPage
	};
}

/**
 * 按需加载历史记录页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadHistoryRoute() {
	const { HistoryPage } = await import('@/features/learning-center/pages/history-page');

	return {
		Component: HistoryPage
	};
}

/**
 * 按需加载收藏页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadFavoritesRoute() {
	const { FavoritesPage } = await import(
		'@/features/learning-center/pages/favorites-page'
	);

	return {
		Component: FavoritesPage
	};
}

/**
 * 按需加载个人资料页（Epic 9）。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadProfileRoute() {
	const { ProfilePage } = await import('@/features/profile/pages/profile-page');

	return {
		Component: ProfilePage
	};
}

/**
 * 按需加载设置页（Epic 9）。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadSettingsRoute() {
	const { SettingsPage } = await import('@/features/profile/pages/settings-page');

	return {
		Component: SettingsPage
	};
}

/**
 * 按需加载课堂输入页，确保受保护工作区独立分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadClassroomInputRoute() {
	const { ClassroomInputPage } = await import(
		'@/features/classroom/pages/classroom-input-page'
	);

	return {
		Component: ClassroomInputPage
	};
}

/**
 * 按需加载用户配置引导第一页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadProfileSetupRoute() {
	const { ProfileIntroPage } = await import(
		'@/features/profile/pages/profile-intro-page'
	);

	return {
		Component: ProfileIntroPage
	};
}

/**
 * 按需加载用户配置偏好收集页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadProfilePreferencesRoute() {
	const { ProfilePreferencesPage } = await import(
		'@/features/profile/pages/profile-preferences-page'
	);

	return {
		Component: ProfilePreferencesPage
	};
}

/**
 * 按需加载用户配置导览页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadProfileTourRoute() {
	const { ProfileTourPage } = await import(
		'@/features/profile/pages/profile-tour-page'
	);

	return {
		Component: ProfileTourPage
	};
}

/**
 * 按需加载视频输入页，确保其他入口按路由切分。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadVideoInputRoute() {
	const { VideoInputPage } = await import('@/features/video/pages/video-input-page');

	return {
		Component: VideoInputPage
	};
}

/**
 * 按需加载视频等待页占位路由。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadVideoGeneratingRoute() {
	const { VideoGeneratingPage } = await import(
		'@/features/video/pages/video-generating-page'
	);

	return {
		Component: VideoGeneratingPage
	};
}

/**
 * 按需加载视频结果页路由。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadVideoResultRoute() {
	const { VideoResultPage } = await import(
		'@/features/video/pages/video-result-page'
	);

	return {
		Component: VideoResultPage
	};
}

/**
 * 按需加载 Learning Coach 会话后入口页。
 */
async function loadLearningCoachEntryRoute() {
	const { LearningCoachEntryPage } = await import(
		'@/features/learning-coach/pages/learning-coach-entry-page'
	);

	return {
		Component: LearningCoachEntryPage
	};
}

/**
 * 按需加载 Learning Coach Checkpoint 页。
 */
async function loadLearningCheckpointRoute() {
	const { LearningCheckpointPage } = await import(
		'@/features/learning-coach/pages/learning-checkpoint-page'
	);

	return {
		Component: LearningCheckpointPage
	};
}

/**
 * 按需加载 Learning Coach Quiz 页。
 */
async function loadLearningQuizRoute() {
	const { LearningQuizPage } = await import(
		'@/features/learning-coach/pages/learning-quiz-page'
	);

	return {
		Component: LearningQuizPage
	};
}

/**
 * 按需加载 Learning Coach Quiz 只读回看页（Epic 8/9，Decision 1）。
 */
async function loadLearningQuizReviewRoute() {
	const { LearningQuizReviewPage } = await import(
		'@/features/learning-coach/pages/learning-quiz-review-page'
	);

	return {
		Component: LearningQuizReviewPage
	};
}

/**
 * 按需加载 Learning Coach 学习路径页。
 */
async function loadLearningPathRoute() {
	const { LearningPathPage } = await import(
		'@/features/learning-coach/pages/learning-path-page'
	);

	return {
		Component: LearningPathPage
	};
}

/**
 * 按需加载 OpenMAIC 课堂播放页（幻灯片 + 白板 + 讨论）。
 *
 * 入口复用既有 /classroom/input（由 features/classroom 提供 UI + 样式），
 * 不再维护 /openmaic 重复首页。
 */
async function loadOpenMAICClassroomRoute() {
	const { OpenMAICClassroomPage } = await import(
		'@/features/openmaic/pages/openmaic-classroom-page'
	);

	return {
		Component: OpenMAICClassroomPage
	};
}

/**
 * 按需加载 OpenMAIC 设置页（Provider 偏好 / Web 搜索开关）。
 */
async function loadOpenMAICSettingsRoute() {
	const { OpenMAICSettingsPage } = await import(
		'@/features/openmaic/pages/openmaic-settings-page'
	);

	return {
		Component: OpenMAICSettingsPage
	};
}

/**
 * 按需加载公开视频结果详情页路由。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadPublicVideoResultRoute() {
	const { VideoResultPage } = await import(
		'@/features/video/pages/video-result-page'
	);

	return {
		Component: VideoResultPage
	};
}

/**
 * 创建应用级 Browser Router。
 *
 * 为运行时入口保留单例导出，同时允许浏览器级测试为每个用例生成独立 router，
 * 避免跨用例共享 history 与懒加载状态。
 *
 * @returns 全量应用路由实例。
 */
export function createAppRouter() {
	return createBrowserRouter([
		{
			path: '/',
			element: <AppShell />,
			children: [
				{
					index: true,
					lazy: loadHomeRoute
				},
				{
					path: 'landing',
					lazy: loadLandingRoute
				},
				{
					path: 'video/public/:resultId',
					lazy: loadPublicVideoResultRoute
				},
				{
					element: <RequireAuthRoute />,
					children: [
						{
							path: 'learning',
							lazy: loadLearningCenterRoute
						},
						{
							path: 'history',
							lazy: loadHistoryRoute
						},
						{
							path: 'favorites',
							lazy: loadFavoritesRoute
						},
						{
							path: 'profile',
							lazy: loadProfileRoute
						},
						{
							path: 'settings',
							lazy: loadSettingsRoute
						},
						{
							path: 'profile/setup',
							lazy: loadProfileSetupRoute
						},
						{
							path: 'profile/setup/preferences',
							lazy: loadProfilePreferencesRoute
						},
						{
							path: 'profile/setup/tour',
							lazy: loadProfileTourRoute
						},
						{
							path: 'classroom/input',
							lazy: loadClassroomInputRoute
						},
						{
							path: 'video/input',
							lazy: loadVideoInputRoute
						},
						{
							path: 'video/:taskId/generating',
							lazy: loadVideoGeneratingRoute
						},
						{
							path: 'video/:taskId',
							lazy: loadVideoResultRoute
						},
						{
							path: 'coach/:sessionId',
							lazy: loadLearningCoachEntryRoute
						},
						{
							path: 'checkpoint/:sessionId',
							lazy: loadLearningCheckpointRoute
						},
						{
							path: 'quiz/:sessionId',
							lazy: loadLearningQuizRoute
						},
						{
							path: 'quiz/:sessionId/review/:quizId',
							lazy: loadLearningQuizReviewRoute
						},
						{
							path: 'path',
							lazy: loadLearningPathRoute
						},
						{
							path: 'openmaic/classroom/:classroomId',
							lazy: loadOpenMAICClassroomRoute
						},
						{
							path: 'openmaic/settings',
							lazy: loadOpenMAICSettingsRoute
						}
					]
				},
				{
					path: 'login',
					lazy: loadLoginRoute
				},
				{
					path: 'login/social-callback',
					lazy: loadSocialCallbackRoute
				},
				{
					path: 'forbidden',
					lazy: loadForbiddenRoute
				}
			]
		}
	]);
}

export const appRouter = createAppRouter();
