/**
 * OpenMAIC 设置页。
 * 展示当前设置状态，可作为模态对话框或独立页面使用。
 */
import { RotateCcw } from 'lucide-react';

import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { useOpenMAICSettingsStore } from '../store/settings-store';

export function OpenMAICSettingsPage() {
  const settings = useOpenMAICSettingsStore();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalTopNav links={[]} variant="surface" />

      <main className="mx-auto w-full max-w-lg px-6 py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">OpenMAIC 设置</h1>
            <p className="mt-1 text-sm text-muted-foreground">配置课堂生成偏好</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            {/* 语言设置 */}
            <SettingRow
              label="显示语言"
              description="课堂内容和界面的语言"
            >
              <select
                value={settings.language}
                onChange={(e) =>
                  settings.updateSettings({ language: e.target.value as 'zh-CN' | 'en-US' })
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                <option value="zh-CN">中文（简体）</option>
                <option value="en-US">English</option>
              </select>
            </SettingRow>

            <div className="border-t border-border" />

            {/* 语音速度 */}
            <SettingRow
              label="语音播放速度"
              description={`当前：${settings.speechRate.toFixed(1)}x`}
            >
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={settings.speechRate}
                onChange={(e) =>
                  settings.updateSettings({ speechRate: parseFloat(e.target.value) })
                }
                className="w-32 accent-primary"
              />
            </SettingRow>

            <div className="border-t border-border" />

            {/* 自动进入下一场景 */}
            <SettingRow
              label="自动进入下一场景"
              description="场景播放结束后自动切换"
            >
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoAdvanceScenes}
                onClick={() =>
                  settings.updateSettings({ autoAdvanceScenes: !settings.autoAdvanceScenes })
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.autoAdvanceScenes ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    settings.autoAdvanceScenes ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </SettingRow>

            <div className="border-t border-border" />

            {/* 网络搜索 */}
            <SettingRow
              label="默认启用网络搜索"
              description="生成课堂时自动联网获取最新资料"
            >
              <button
                type="button"
                role="switch"
                aria-checked={settings.enableWebSearch}
                onClick={() =>
                  settings.updateSettings({ enableWebSearch: !settings.enableWebSearch })
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.enableWebSearch ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    settings.enableWebSearch ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </SettingRow>
          </div>

          {/* 重置按钮 */}
          <button
            type="button"
            onClick={settings.resetSettings}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认设置
          </button>
        </div>
      </main>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
