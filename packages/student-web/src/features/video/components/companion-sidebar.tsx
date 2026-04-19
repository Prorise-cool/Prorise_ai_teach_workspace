/**
 * 文件说明：Companion 智能侧栏壳层组件。
 * 对齐结果页单页设计稿，承接主题切换、菜单入口、聊天占位与输入区。
 */
import {
  AlertCircle,
  Bot,
  Clock,
  Download,
  HelpCircle,
  Image as ImageIcon,
  Link,
  Moon,
  MoreHorizontal,
  Paperclip,
  Rocket,
  Send,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

export interface CompanionSidebarProps {
  /** 侧栏是否展开。 */
  isOpen: boolean;
  /** 关闭侧栏（当前仅用于保持调用契约）。 */
  onClose?: () => void;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染 Companion 智能侧栏。
 *
 * @param props - 侧栏属性。
 * @returns 侧栏 UI。
 */
export function CompanionSidebar({
  isOpen,
  onClose: _onClose,
  className,
}: CompanionSidebarProps) {
  const { t } = useAppTranslation();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const isDark = themeMode === 'dark';

  return (
    <aside
      className={cn(
        'xm-companion',
        !isOpen && 'xm-companion--collapsed',
        className,
      )}
    >
      <div className="xm-companion__drag-handle" />
      <div className="xm-companion__inner">
        <header className="xm-companion__header">
          <div className="xm-companion__header-brand">
            <div className="xm-companion__avatar">
              <Bot className="w-4 h-4" />
            </div>
            <div className="xm-companion__header-copy">
              <span className="xm-companion__header-title">XiaoMai AI</span>
              <span className="xm-companion__header-subtitle">随课智能答疑与画板</span>
            </div>
          </div>

          <div className="xm-companion__header-actions">
            <button
              type="button"
              className="xm-companion__header-circle"
              onClick={toggleThemeMode}
              aria-label={t('video.generating.toggleTheme')}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="dropdown-trigger">
              <button
                type="button"
                className="xm-companion__header-circle"
                aria-label={t('video.result.settings')}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <div className="dropdown-menu">
                <button type="button" className="dropdown-item">
                  <Paperclip className="w-4 h-4 opacity-70" />
                  {t('video.companion.evidenceTitle')}
                </button>
                <button type="button" className="dropdown-item">
                  <Clock className="w-4 h-4 opacity-70" />
                  {t('video.companion.historyTitle')}
                </button>
                <button type="button" className="dropdown-item">
                  <Download className="w-4 h-4 opacity-70" />
                  导出完整板书
                </button>
                <div className="xm-companion__dropdown-divider" />
                <button type="button" className="dropdown-item dropdown-item--danger">
                  <Trash2 className="w-4 h-4 opacity-70" />
                  清空历史对话
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="xm-companion__anchor">
          <Link className="w-3.5 h-3.5 shrink-0" />
          <span className="xm-companion__anchor-text">
            {t('video.companion.anchorLabel', {
              anchor: 'T=02:15 / Scene-02 / 积分概念',
            })}
          </span>
          <button type="button" className="xm-companion__anchor-close">
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="xm-companion__chat">
          <div className="bubble-user">这块没听懂，积分为什么能等于面积？</div>

          <div className="xm-companion__message-group">
            <div className="xm-companion__message-meta">
              <div className="xm-companion__message-avatar">
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="xm-companion__message-name">XiaoMai</span>
            </div>
            <div className="bubble-ai xm-markdown">
              <p>好问题！这正是微积分的魅力。</p>
              <p>你可以把不规则的面积想象成无数个“极细的矩形”拼成的：</p>
              <ul>
                <li>每个矩形的宽度是无限小的 <code>dx</code>。</li>
                <li>每个矩形的高度是函数在该点的值 <code>f(x)</code>。</li>
              </ul>
              <p>
                当把所有矩形的面积加起来，取极限，就变成了这条曲线下的精确面积。你可以在底部提问让我进行更详细的动态推演。
              </p>
            </div>
          </div>
        </div>

        <div className="xm-companion__input-area">
          <div className="xm-companion__quick-tags">
            <button type="button" className="xm-companion__quick-tag">
              <HelpCircle className="w-3 h-3" />
              {t('video.companion.quickNotUnderstand')}
            </button>
            <button type="button" className="xm-companion__quick-tag">
              <AlertCircle className="w-3 h-3" />
              {t('video.companion.quickExample')}
            </button>
            <button type="button" className="xm-companion__quick-tag">
              <Rocket className="w-3 h-3" />
              画板演示
            </button>
          </div>

          <div className="xm-companion__input-box">
            <textarea
              className="xm-companion__textarea"
              placeholder="输入公式问题或要求推演..."
              rows={1}
              readOnly
            />

            <div className="xm-companion__input-tools">
              <div className="xm-companion__tools-left">
                <button
                  type="button"
                  className="xm-companion__tool-btn"
                  title="插入图片/截图"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="xm-companion__tool-btn"
                  title="上传文件"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <span className="xm-companion__input-count">
                  {t('video.companion.charCount', { count: 0 })}
                </span>
              </div>

              <button
                type="button"
                className="xm-companion__send-btn"
                aria-label={t('video.common.continueLearning')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
