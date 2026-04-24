/**
 * 视频侧 Companion 侧栏 —— Phase 4 之后只是共享组件的 consumer。
 *
 * 本文件保留原 export `CompanionSidebar` + `CompanionSidebarProps` 以保证
 * `video-result-page.tsx` 等调用方零改动。它把视频特有的"当前画面截帧 +
 * anchor / section"上下文打包成共享侧栏的 `getContextSnapshot`，并把底层
 * `companion-adapter.ask()` 包装成共享侧栏要求的 `CompanionDataAdapter`。
 */
import { AlertCircle, HelpCircle, Rocket } from 'lucide-react';
import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { CompanionSidebar as SharedCompanionSidebar } from '@/components/companion';
import type {
  CompanionAskParams,
  CompanionDataAdapter,
  CompanionQuickAction,
} from '@/components/companion';
import { resolveCompanionAdapter } from '@/services/api/adapters/companion-adapter';
import type { CompanionAnchor } from '@/types/companion';

import type { VideoPlayerHandle } from '../components/video-player';

/* ---------- Props（与旧接口保持一致） ---------- */

export interface CompanionSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  taskId: string;
  currentAnchor: CompanionAnchor;
  playerRef?: RefObject<VideoPlayerHandle | null>;
  className?: string;
}

/* ---------- 帧截取辅助（与旧实现一致） ---------- */

function captureFrame(
  playerRef?: RefObject<VideoPlayerHandle | null>,
): string | null {
  const player = playerRef?.current?.getPlayer();
  if (!player) return null;
  const el = player.el()?.querySelector('video') as HTMLVideoElement | null;
  if (!el || !el.videoWidth) return null;
  try {
    const c = document.createElement('canvas');
    const s = 720 / el.videoWidth;
    c.width = Math.min(el.videoWidth, 720);
    c.height = Math.round(el.videoHeight * s);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(el, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7).split(',')[1] ?? null;
  } catch {
    return null;
  }
}

/* ---------- Consumer 主体 ---------- */

export function CompanionSidebar({
  isOpen,
  onClose,
  taskId,
  currentAnchor,
  playerRef,
  className,
}: CompanionSidebarProps) {
  const { t } = useAppTranslation();
  const [sessionId, setSessionId] = useState<string | undefined>();

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    const api = resolveCompanionAdapter();
    api
      .bootstrap(taskId)
      .then((data) => {
        if (!cancelled) setSessionId(data.sessionId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const anchorLabel = useMemo(() => {
    const mins = Math.floor(currentAnchor.seconds / 60);
    const secs = Math.floor(currentAnchor.seconds % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const parts = [`T=${timeStr}`];
    if (currentAnchor.sectionTitle) parts.push(currentAnchor.sectionTitle);
    return parts.join(' / ');
  }, [currentAnchor.seconds, currentAnchor.sectionTitle]);

  const adapter = useMemo<CompanionDataAdapter>(() => {
    const api = resolveCompanionAdapter();
    return {
      ask(params: CompanionAskParams) {
        return (async function* () {
          const meta =
            (params.contextSnapshot.metadata as
              | { anchor?: CompanionAnchor }
              | undefined) ?? {};
          const anchor = meta.anchor ?? currentAnchor;
          try {
            const response = await api.ask(
              {
                sessionId: sessionId ?? `comp_sess_${taskId}`,
                anchor,
                questionText: params.questionText,
                frameBase64: params.contextSnapshot.imageBase64 ?? null,
              },
              { signal: params.abortSignal },
            );
            yield { type: 'text' as const, content: response.answerText };
          } catch (err) {
            const message = err instanceof Error ? err.message : '未知错误';
            yield { type: 'error' as const, message };
          }
        })();
      },
    };
  }, [currentAnchor, sessionId, taskId]);

  const getContextSnapshot = useCallback(
    () => ({
      imageBase64: captureFrame(playerRef),
      metadata: { anchor: currentAnchor },
    }),
    [playerRef, currentAnchor],
  );

  const quickActions = useMemo<CompanionQuickAction[]>(
    () => [
      {
        label: t('video.companion.quickNotUnderstand'),
        icon: <HelpCircle className="w-3 h-3" />,
        prompt: t('video.companion.quickNotUnderstandText'),
      },
      {
        label: t('video.companion.quickExample'),
        icon: <AlertCircle className="w-3 h-3" />,
        prompt: t('video.companion.quickExampleText'),
      },
      {
        label: t('video.companion.quickWhiteboard'),
        icon: <Rocket className="w-3 h-3" />,
        prompt: t('video.companion.quickWhiteboardText'),
      },
    ],
    [t],
  );

  return (
    <SharedCompanionSidebar
      isOpen={isOpen}
      onClose={onClose}
      adapter={adapter}
      getContextSnapshot={getContextSnapshot}
      anchorLabel={anchorLabel}
      quickActions={quickActions}
      theme="amber"
      sessionKey={taskId}
      className={className}
    />
  );
}
