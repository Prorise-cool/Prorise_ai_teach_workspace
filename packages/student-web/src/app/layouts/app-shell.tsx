/**
 * 文件说明：应用级页面壳层。
 * 当前仅承接全局背景和 Outlet，供业务页面复用统一宿主。
 */
import { Outlet } from 'react-router-dom';

/**
 * 渲染应用公共壳层，并为业务页面提供统一背景与文本色。
 *
 * @returns 页面壳层节点。
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
