/**
 * 文件说明：课堂输入壳层，承载主题课堂输入与老师风格透传。
 */
import { ArrowRight, LibraryBig } from 'lucide-react';
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

export function ClassroomInputShell() {
  const session = useAuthStore(state => state.session);
  const [topic, setTopic] = useState('');
  const [styleKey, setStyleKey] = useState<AgentStyleKey>(DEFAULT_AGENT_STYLE_KEY);
  const [preview, setPreview] = useState<TaskLaunchPreviewResponse | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const currentPreset = resolveAgentConfigPreset(styleKey);

  async function handleCreatePreview() {
    if (!session) {
      return;
    }

    if (!topic.trim()) {
      toast.error('请先输入课堂主题或知识点');
      return;
    }

    setIsLaunching(true);

    try {
      const payload = createTaskLaunchRequest(
        'classroom',
        session.user.id,
        `主题课堂：${topic.slice(0, 20)}`,
        topic,
        toAgentConfigPayload(currentPreset)
      );
      const response = await createTaskPreview('classroom', payload);

      setPreview(response);
      toast.success('已生成主题课堂请求预览');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建主题课堂请求失败');
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
              <LibraryBig className="h-4 w-4" />
              主题课堂输入
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                把一个知识主题扩展成完整课堂
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                适合从零建立知识框架、组织课堂叙事与后续测验。Epic 1 先固定输入壳层、默认风格和 `agentConfig` 语义。
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-[var(--xm-radius-xl)] border border-border bg-background/70 p-5">
              <label className="text-sm font-semibold text-foreground" htmlFor="classroom-topic">
                课堂主题
              </label>
              <textarea
                className="mt-3 min-h-[180px] w-full rounded-[var(--xm-radius-lg)] border border-border bg-card px-4 py-4 text-sm leading-7 text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
                id="classroom-topic"
                onChange={event => setTopic(event.target.value)}
                placeholder="例如：牛顿第二定律的图像化理解、单调函数与导数、职业院校电路基础..."
                value={topic}
              />
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
              {isLaunching ? '创建中...' : '创建主题课堂请求预览'}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className={`rounded-[var(--xm-radius-xl)] border border-border bg-card/90 p-5 shadow-sm ${currentPreset.accentClassName}`}>
            <div className="text-sm font-semibold text-foreground">局部课堂风格提示</div>
            <div className="mt-4 rounded-[var(--xm-radius-lg)] border border-[color:var(--xm-color-agent-accent-border)] bg-[color:var(--xm-color-agent-accent-soft)] px-4 py-4">
              <div className="text-base font-semibold text-foreground">
                {currentPreset.displayName}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {currentPreset.description}
              </p>
            </div>
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
                创建预览后，这里会显示课堂任务请求和老师风格的透传结果。
              </p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
