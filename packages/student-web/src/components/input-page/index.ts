/**
 * 文件说明：输入页共享组件统一导出。
 * 供视频输入页与课堂输入页消费共享的 Header、GuideCards、Suggestions。
 */
export { InputPageHeader } from './input-page-header';
export { InputPageSuggestions } from './input-page-suggestions';
export {
  type InputWorkspaceNavLink,
  type InputWorkspaceRoute,
  WorkspaceInputShell,
} from './workspace-input-shell';
export { useFileDropzone } from './hooks/use-file-dropzone';
export { useBrowserAsr } from './hooks/use-browser-asr';
