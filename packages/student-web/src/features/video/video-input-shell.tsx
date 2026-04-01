/**
 * 文件说明：视频输入壳层，承载单题视频输入与老师风格透传。
 */
import { ArrowRight, Film, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  DEFAULT_AGENT_STYLE_KEY,
  resolveAgentConfigPreset,
  toAgentConfigPayload,
  type AgentStyleKey
} from '@/features/agent/agent-config';
import { AgentSelector } from '@/features/agent/agent-selector';
import {
  createTaskLaunchRequest,
  createTaskPreview,
  type TaskLaunchPreviewResponse
} from '@/services/task-launcher';
import { useAuthStore } from '@/stores/auth-store';

export function VideoInputShell() {
  const session = useAuthStore(state => state.session);
  const [question, setQuestion] = useState('');
  const [styleKey, setStyleKey] = useState<AgentStyleKey>(DEFAULT_AGENT_STYLE_KEY);
  const [preview, setPreview] = useState<TaskLaunchPreviewResponse | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const currentPreset = resolveAgentConfigPreset(styleKey);

  async function handleCreatePreview() {
    if (!session) {
      return;
    }

    if (!question.trim()) {
      toast.error('请先输入题目描述或题目背景');
      return;
    }

    setIsLaunching(true);

    try {
      const payload = createTaskLaunchRequest(
        'video',
        session.user.id,
        `单题视频：${question.slice(0, 20)}`,
        question,
        toAgentConfigPayload(currentPreset)
      );
      const response = await createTaskPreview('video', payload);

      setPreview(response);
      toast.success('已生成单题视频请求预览');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建单题视频请求失败');
    } finally {
      setIsLaunching(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-12">
      <section className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="xm-surface-card rounded-[var(--xm-radius-xl)] p-6 md:p-8">
          <div className="space-y-4">
            <span className="xm-floating-pill inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              <Film className="h-4 w-4" />
              单题视频输入
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                把一道题快速讲清
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                适合已经拿到题目、截图或明确难点的场景。当前 Epic 1 先把输入壳和老师风格透传固定下来，不提前展开结果页逻辑。
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-[var(--xm-radius-xl)] border border-border bg-background/70 p-5">
              <label className="text-sm font-semibold text-foreground" htmlFor="video-question">
                题目描述
              </label>
              <textarea
                className="mt-3 min-h-[180px] w-full rounded-[var(--xm-radius-lg)] border border-border bg-card px-4 py-4 text-sm leading-7 text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
                id="video-question"
                onChange={event => setQuestion(event.target.value)}
                placeholder="粘贴题目、补充上下文，或说明你想重点听懂的部分。"
                value={question}
              />

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                <UploadCloud className="h-4 w-4" />
                后续 Story 会接入 OCR / 图片上传
              </div>
            </div>

            <AgentSelector onChange={setStyleKey} value={styleKey} />

            <button
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLaunching}
              onClick={() => {
                void handleCreatePreview();
              }}
              type="button"
            >
              <ArrowRight className="h-4 w-4" />
              {isLaunching ? '创建中...' : '创建单题视频请求预览'}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className={`rounded-[var(--xm-radius-xl)] border border-border bg-card/90 p-5 shadow-sm ${currentPreset.accentClassName}`}>
            <div className="text-sm font-semibold text-foreground">当前老师指示器</div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--xm-color-agent-accent-border)] bg-[color:var(--xm-color-agent-accent-soft)] text-lg font-bold text-[color:var(--xm-color-agent-accent)]">
                {currentPreset.avatarLabel}
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">
                  {currentPreset.displayName}
                </div>
                <div className="text-sm text-muted-foreground">
                  Accent: {currentPreset.accentHex}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              这里只改变当前输入壳的局部标签和点缀，不切换页面级主题。
            </p>
          </section>

          <section className="rounded-[var(--xm-radius-xl)] border border-border bg-card/90 p-5 shadow-sm">
            <div className="text-sm font-semibold text-foreground">请求透传预览</div>
            {preview ? (
              <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div>
                  <dt className="font-semibold text-foreground">taskId</dt>
                  <dd>{preview.task.task_id}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">taskType</dt>
                  <dd>{preview.task.task_type}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">summary</dt>
                  <dd>{preview.task.summary}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">agentConfig</dt>
                  <dd className="break-all">
                    {JSON.stringify(preview.ruoyi_payload.agentConfig ?? preview.ruoyi_payload.agent_config ?? null)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                创建预览后，这里会显示当前任务请求与 `agentConfig` 透传结果。
              </p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
