/**
 * OpenMAIC 首页。
 * 输入主题 + PDF 上传 + Web 搜索开关 + 最近课堂列表。
 */
import { Clock, GraduationCap, Loader2, Paperclip, Search, Sparkles, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { useClassroomCreate } from '../hooks/use-classroom';
import { useRecentClassrooms } from '../hooks/use-classroom-db';
import { useClassroomStore } from '../store/classroom-store';
import { useOpenMAICSettingsStore } from '../store/settings-store';
import { parsePdf } from '../api/openmaic-adapter';
import type { ClassroomMeta } from '../types/classroom';
import { GenerationToolbar } from '../components/generation/generation-toolbar';

const TOPIC_MAX_LENGTH = 2000;
const TOPIC_MIN_LENGTH = 10;

export function OpenMAICHomePage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [pdfText, setPdfText] = useState<string | undefined>();
  const [pdfFileName, setPdfFileName] = useState<string | undefined>();
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = useOpenMAICSettingsStore();
  const generationProgress = useClassroomStore((s) => s.generationProgress);
  const generationMessage = useClassroomStore((s) => s.generationMessage);

  const { create, cancel } = useClassroomCreate();
  const { metas, isLoading: metasLoading, remove } = useRecentClassrooms();

  const [isGenerating, setIsGenerating] = useState(false);

  const canSubmit = topic.trim().length >= TOPIC_MIN_LENGTH && !isGenerating;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsGenerating(true);
    try {
      const classroomId = await create({
        requirement: topic.trim(),
        pdfText,
        enableWebSearch: settings.enableWebSearch,
      });
      void navigate(`/openmaic/classroom/${classroomId}`);
    } catch (error) {
      console.error('课堂生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [canSubmit, create, topic, pdfText, settings.enableWebSearch, navigate]);

  const handlePdfUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) return;
    setIsParsing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { text } = await parsePdf(form);
      setPdfText(text);
      setPdfFileName(file.name);
    } catch {
      setPdfText(undefined);
      setPdfFileName(undefined);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handlePdfUpload(file);
    },
    [handlePdfUpload],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalTopNav links={[]} variant="surface" />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl space-y-8">
          {/* 品牌标题区 */}
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              OpenMAIC
            </p>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              一句话，生成多智能体课堂
            </h1>
            <p className="text-sm text-muted-foreground">
              输入你想学的主题，AI 老师与同学将为你打造一堂完整的互动课。
            </p>
          </div>

          {/* 输入卡片 */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：教我微积分中的链式法则，给出例题并让 AI 同学讨论（⌘+Enter 提交）"
              maxLength={TOPIC_MAX_LENGTH}
              disabled={isGenerating}
              className="h-32 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
            />

            {/* 选项行 */}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
              {/* PDF 上传 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || isParsing}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {isParsing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Paperclip className="h-3 w-3" />
                )}
                {pdfFileName ? (
                  <span className="max-w-[120px] truncate">{pdfFileName}</span>
                ) : (
                  '上传 PDF'
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Web 搜索开关 */}
              <button
                type="button"
                onClick={() =>
                  settings.updateSettings({ enableWebSearch: !settings.enableWebSearch })
                }
                disabled={isGenerating}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  settings.enableWebSearch
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Search className="h-3 w-3" />
                网络搜索
              </button>

              {/* 字符计数 + 提交 */}
              <div className="ml-auto flex items-center gap-3">
                <span
                  className={`text-xs ${
                    topic.length > TOPIC_MAX_LENGTH * 0.9
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {topic.length} / {TOPIC_MAX_LENGTH}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? '生成中...' : '生成课堂'}
                </button>
              </div>
            </div>
          </div>

          {/* 最近课堂列表 */}
          <RecentClassrooms
            metas={metas}
            isLoading={metasLoading}
            onOpen={(id) => void navigate(`/openmaic/classroom/${id}`)}
            onDelete={(id) => void remove(id)}
          />
        </div>
      </main>

      {/* 生成进度条（全局浮层） */}
      <GenerationToolbar
        progress={generationProgress}
        message={generationMessage}
        isGenerating={isGenerating}
        onCancel={() => {
          cancel();
          setIsGenerating(false);
        }}
      />
    </div>
  );
}

interface RecentClassroomsProps {
  metas: ClassroomMeta[];
  isLoading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function RecentClassrooms({ metas, isLoading, onOpen, onDelete }: RecentClassroomsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (metas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">最近课堂</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {metas.slice(0, 6).map((meta) => (
          <div
            key={meta.id}
            className="group relative cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            onClick={() => onOpen(meta.id)}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{meta.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.requirement}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      meta.status === 'ready'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : meta.status === 'generating'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {meta.status === 'ready' ? '已就绪' : meta.status === 'generating' ? '生成中' : '失败'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {meta.sceneCount} 个场景
                  </span>
                </div>
              </div>
            </div>
            {/* 删除按钮 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(meta.id);
              }}
              className="absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
