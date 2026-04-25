/**
 * 文件说明：课堂输入页核心输入卡片组件。
 * 保留课堂页既有视觉与交互语义，仅把冗余结构从页面容器中下沉为可复用组件。
 */
import type { ChangeEventHandler, ReactNode, RefObject } from 'react';
import { ArrowRight, FileText, Mic, Paperclip, X } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { InputWorkspaceCardFrame } from '@/components/input-page/input-workspace-card-frame';
import { createInputWorkspaceCardClassNames } from '@/components/input-page/input-workspace-card-class-names';
import { cn } from '@/lib/utils';

type ClassroomInputCardProps = {
  /** 当前输入文本。 */
  text: string;
  /** 文本变化回调。 */
  onTextChange: ChangeEventHandler<HTMLTextAreaElement>;
  /** 是否正在语音输入。 */
  isRecording: boolean;
  /** 切换语音输入回调。 */
  onToggleRecording: () => void;
  /** 是否正在拖拽附件。 */
  isDragging: boolean;
  /** 拖拽进入处理器。 */
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  /** 拖拽离开处理器。 */
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  /** 放下文件处理器。 */
  onDrop: React.DragEventHandler<HTMLDivElement>;
  /** 当前已附加文件。 */
  attachedFile: File | null;
  /** 清理文件回调。 */
  onClearFile: () => void;
  /** 打开文件选择器回调。 */
  onTriggerSelect: () => void;
  /** 文件输入框 ref。 */
  fileInputRef: RefObject<HTMLInputElement | null>;
  /** 文件选择变化回调。 */
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  /** 提交动作回调。 */
  onSubmit: () => void;
  /** 文案集合。 */
  labels: {
    smartMatchHint: string;
    smartMatchDesc: string;
    multiAgentHint: string;
    placeholder: string;
    submitLabel: string;
    toolUploadFile: string;
    toolVoiceInput: string;
    advancedSettings?: string;
    advancedSummary?: string;
  };
  /**
   * 高级参数摘要药丸，点击触发外部弹窗；不传则不显示按钮。
   * 外部负责包裹 `Dialog` + `DialogTrigger`，这里只渲染触发按钮的 content。
   */
  advancedTrigger?: ReactNode;
};

/**
 * 渲染课堂输入卡片。
 *
 * @param props - 课堂输入卡片参数。
 * @returns 课堂输入卡片节点。
 */
export function ClassroomInputCard({
  text,
  onTextChange,
  isRecording,
  onToggleRecording,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  attachedFile,
  onClearFile,
  onTriggerSelect,
  fileInputRef,
  onFileChange,
  onSubmit,
  labels,
  advancedTrigger,
}: ClassroomInputCardProps) {
  const { t } = useAppTranslation();
  const classNames = createInputWorkspaceCardClassNames('xm-classroom-input');
  const toolButtonClassName = `${classNames.root}-tool-btn`;
  const submitClassName = `${classNames.root}-submit`;

  return (
    <InputWorkspaceCardFrame
      block="xm-classroom-input"
      smartMatchHint={labels.smartMatchHint}
      smartMatchDesc={labels.smartMatchDesc}
      multiAgentHint={labels.multiAgentHint}
      dragOverlayLabel={t('classroom.inputCard.dragOverlayUpload')}
      isDragging={isDragging}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      body={
        <>
          {attachedFile ? (
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--xm-color-border-subtle)] bg-[color:var(--xm-color-surface-sunken)] p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[color:var(--xm-color-surface-highest)]">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-foreground">
                    {attachedFile.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={onClearFile}
                title={t('classroom.inputCard.quoteRemove')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <textarea
            className={`${classNames.root}-textarea`}
            placeholder={labels.placeholder}
            rows={4}
            value={text}
            onChange={onTextChange}
          />
        </>
      }
      tools={
        <>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={onFileChange}
          />
          <button
            type="button"
            className={toolButtonClassName}
            title={labels.toolUploadFile}
            onClick={onTriggerSelect}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              `${toolButtonClassName} relative`,
              isRecording && 'text-primary bg-[color:var(--xm-color-brand-50)]'
            )}
            title={labels.toolVoiceInput}
            onClick={onToggleRecording}
          >
            {isRecording ? (
              <div className="flex h-4 w-4 items-center justify-center gap-[2px]">
                <span className="h-2 w-[2px] rounded-full bg-current animate-audio-bar-1" />
                <span className="h-4 w-[2px] rounded-full bg-current animate-audio-bar-2" />
                <span className="h-3 w-[2px] rounded-full bg-current animate-audio-bar-3" />
              </div>
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {isRecording ? (
              <span className="absolute inset-0 rounded-md bg-[color:var(--xm-color-brand-500)] opacity-20 animate-ping" />
            ) : null}
          </button>

          {advancedTrigger ? <>{advancedTrigger}</> : null}
        </>
      }
      submitAction={
        <button
          type="button"
          className={submitClassName}
          onClick={onSubmit}
        >
          <span>{labels.submitLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      }
    />
  );
}
