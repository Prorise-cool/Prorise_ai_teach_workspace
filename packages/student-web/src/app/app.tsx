/**
 * 文件说明：student-web 根组件。
 * 负责组合全局 Provider 和浏览器路由入口。
 */
import { AppProvider } from '@/app/provider/app-provider';
import { AppRouter } from '@/app/router/router';

/**
 * 渲染 student-web 应用根组件，并装配全局 Provider 与路由宿主。
 *
 * @returns 应用根节点。
 */
export function App() {
	return (
		<AppProvider>
			<AppRouter />
		</AppProvider>
	);
}
