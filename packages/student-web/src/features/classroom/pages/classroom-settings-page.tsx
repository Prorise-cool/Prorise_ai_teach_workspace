/**
 * 课堂设置页（由 OpenMAIC 移植，Wave 1 已合入 features/classroom）。
 * 展示当前设置状态，可作为模态对话框或独立页面使用。
 */
import { RotateCcw } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { useClassroomSettingsStore } from '../stores/settings-store';

export function ClassroomSettingsPage() {
  const { t } = useAppTranslation();
  const settings = useClassroomSettingsStore();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalTopNav links={[]} variant="surface" />

      <main className="mx-auto w-full max-w-lg px-6 py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('classroom.settingsPage.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('classroom.settingsPage.description')}</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            {/* 语言设置 */}
            <SettingRow
              label={t('classroom.settingsPage.displayLanguageLabel')}
              description={t('classroom.settingsPage.displayLanguageDescription')}
            >
              <select
                value={settings.language}
                onChange={(e) =>
                  settings.updateSettings({ language: e.target.value as 'zh-CN' | 'en-US' })
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                <option value="zh-CN">{t('classroom.settingsPage.localeZh')}</option>
                <option value="en-US">{t('classroom.settingsPage.localeEn')}</option>
              </select>
            </SettingRow>

            <div className="border-t border-border" />

            {/* 语音速度 */}
            <SettingRow
              label={t('classroom.settingsPage.ttsSpeedLabel')}
              description={t('classroom.settingsPage.speechRateCurrent', { rate: settings.speechRate.toFixed(1) })}
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
              label={t('classroom.settingsPage.autoNextLabel')}
              description={t('classroom.settingsPage.autoNextDescription')}
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
              label={t('classroom.settingsPage.webSearchLabel')}
              description={t('classroom.settingsPage.webSearchDescription')}
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
            {t('classroom.settingsPage.resetDefaults')}
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
