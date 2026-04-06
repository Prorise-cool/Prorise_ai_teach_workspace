/**
 * 文件说明：输入工作区卡片共享壳层。
 * 负责抽离课堂页与视频页共同的卡片外骨架，保留各自 block class 和样式透传能力。
 */
import type {
  ClipboardEventHandler,
  DragEventHandler,
  ReactNode,
} from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

type InputWorkspaceCardFrameProps = {
  /** 页面级 BEM block，例如 `xm-classroom-input`。 */
  block: string;
  /** 智能匹配提示主文案。 */
  smartMatchHint: string;
  /** 智能匹配提示辅助文案。 */
  smartMatchDesc: string;
  /** 多 Agent 提示文案。 */
  multiAgentHint: string;
  /** 拖拽上传中的提示文案。 */
  dragOverlayLabel: string;
  /** 当前是否正在拖拽。 */
  isDragging: boolean;
  /** 拖拽进入处理器。 */
  onDragOver: DragEventHandler<HTMLDivElement>;
  /** 拖拽离开处理器。 */
  onDragLeave: DragEventHandler<HTMLDivElement>;
  /** 放下文件处理器。 */
  onDrop: DragEventHandler<HTMLDivElement>;
  /** 可选粘贴处理器。 */
  onPaste?: ClipboardEventHandler<HTMLDivElement>;
  /** 卡片正文内容。 */
  body: ReactNode;
  /** 工具栏左侧内容。 */
  tools: ReactNode;
  /** 工具栏右侧提交动作。 */
  submitAction: ReactNode;
};

type InputWorkspaceCardClassNames = {
  root: string;
  hints: string;
  hint: string;
  hintAccent: string;
  hintDesc: string;
  body: string;
  toolbar: string;
  tools: string;
};

/**
 * 由页面 block 推导输入工作区卡片的 BEM class 名。
 *
 * @param block - 页面 block 名。
 * @returns 共享卡片骨架使用的 class 名集合。
 */
export function createInputWorkspaceCardClassNames(
  block: string
): InputWorkspaceCardClassNames {
  const root = `${block}__card`;

  return {
    root,
    hints: `${root}-hints`,
    hint: `${root}-hint`,
    hintAccent: `${root}-hint--accent`,
    hintDesc: `${root}-hint-desc`,
    body: `${root}-body`,
    toolbar: `${root}-toolbar`,
    tools: `${root}-tools`,
  };
}

/**
 * 渲染输入工作区卡片共享壳层。
 *
 * @param props - 共享壳层参数。
 * @returns 输入工作区卡片节点。
 */
export function InputWorkspaceCardFrame({
  block,
  smartMatchHint,
  smartMatchDesc,
  multiAgentHint,
  dragOverlayLabel,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onPaste,
  body,
  tools,
  submitAction,
}: InputWorkspaceCardFrameProps) {
  const classNames = createInputWorkspaceCardClassNames(block);

  return (
    <div className={classNames.root}>
      <div className={classNames.hints}>
        <div className={cn(classNames.hint, classNames.hintAccent)}>
          <Sparkles className="h-3.5 w-3.5" />
          <span>{smartMatchHint}</span>
          <span className={classNames.hintDesc}>{smartMatchDesc}</span>
        </div>
        <div className={classNames.hint}>
          <span>{multiAgentHint}</span>
        </div>
      </div>

      <div
        className={cn(classNames.body, 'relative')}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={onPaste}
      >
        {isDragging ? (
          <div className="absolute inset-0 z-10 m-3 flex flex-col items-center justify-center rounded-[var(--xm-radius-md)] border-2 border-dashed border-primary bg-[color:var(--xm-color-surface-glass)] backdrop-blur-sm">
            <p className="text-sm font-semibold text-primary">
              {dragOverlayLabel}
            </p>
          </div>
        ) : null}

        {body}
      </div>

      <div className={classNames.toolbar}>
        <div className={classNames.tools}>{tools}</div>
        {submitAction}
      </div>
    </div>
  );
}
