/**
 * OpenMAIC feature barrel export.
 * 只导出页面级组件；内部组件通过 deep import 访问。
 *
 * 入口页已复用 /classroom/input（features/classroom），本 feature 只提供
 * 播放页与设置页。
 */
export { OpenMAICClassroomPage } from './pages/openmaic-classroom-page';
export { OpenMAICSettingsPage } from './pages/openmaic-settings-page';
