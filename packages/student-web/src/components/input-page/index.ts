/**
 * 文件说明：输入页共享组件统一导出。
 * 供视频输入页与课堂输入页消费共享的 Header、GuideCards、Suggestions。
 */
export { InputPageHeader } from './input-page-header';
export { InputPageGuideCards, type GuideCardItem } from './input-page-guide-cards';
export { InputPageSuggestions } from './input-page-suggestions';
export { INPUT_PAGE_GUIDE_CARD_ICONS } from './input-page-guide-card-icons';
export {
  type InputWorkspaceNavLink,
  type InputWorkspaceRoute,
  WorkspaceInputShell,
} from './workspace-input-shell';
export { useFileDropzone } from './hooks/use-file-dropzone';
export { useBrowserAsr } from './hooks/use-browser-asr';
