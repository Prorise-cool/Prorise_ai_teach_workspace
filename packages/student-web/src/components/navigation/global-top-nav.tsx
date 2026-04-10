/**
 * 文件说明：提供首页、落地页与后续页面共用的全局顶栏导航。
 * 桌面端与移动端分别由独立组件负责，此文件做薄组合层。
 */
import { Dialog } from '@/components/ui/dialog';
import { useTopNavControls } from '@/components/navigation/use-top-nav-controls';

import type { GlobalTopNavProps } from './global-top-nav-shared';
import { GlobalTopNavDesktop } from './global-top-nav-desktop';
import { GlobalTopNavMobile } from './global-top-nav-mobile';

import '@/components/navigation/global-top-nav.scss';

/**
 * 渲染一个响应式全局顶栏导航，桌面端与移动端分别委托给独立组件。
 *
 * @param props - 组件参数。
 * @returns 顶栏导航节点。
 */
export function GlobalTopNav(props: GlobalTopNavProps) {
	const {
		mobileMenuOpen,
		setMobileMenuOpen
	} = useTopNavControls();

	return (
		<Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
			<GlobalTopNavDesktop
				{...props}
			/>
			<GlobalTopNavMobile
				{...props}
			/>
		</Dialog>
	);
}

export type { GlobalTopNavProps, GlobalTopNavLink, WorkspaceRoute } from './global-top-nav-shared';
