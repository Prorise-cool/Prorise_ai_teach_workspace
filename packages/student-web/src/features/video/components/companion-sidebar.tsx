/**
 * 文件说明：Companion 智能侧栏壳层组件。
 * 右侧问答面板占位 UI，含聊天气泡、快捷标签、输入框、历史/证据抽屉。
 * 后续 Companion Epic 实现时注入真实逻辑。
 */
import {
  AlertCircle,
  ArrowUp,
  Bot,
  Clock,
  HelpCircle,
  Link,
  Paperclip,
  Rocket,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

export interface CompanionSidebarProps {
  /** 侧栏是否展开。 */
  isOpen: boolean;
  /** 关闭侧栏（移动端遮罩点击时触发）。 */
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
export function CompanionSidebar({ isOpen, onClose: _onClose, className }: CompanionSidebarProps) {
  const { t } = useAppTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const toggleHistory = useCallback(() => {
    setHistoryOpen((p) => !p);
    setEvidenceOpen(false);
  }, []);

  const toggleEvidence = useCallback(() => {
    setEvidenceOpen((p) => !p);
    setHistoryOpen(false);
  }, []);

  return (
    <aside
      className={cn(
        'xm-companion',
        !isOpen && 'xm-companion--collapsed',
        className,
      )}
    >
      {/* 移动端拖拽指示条 */}
      <div className="xm-companion__drag-handle" />
      <div className="xm-companion__inner">
        {/* Header */}
        <div className="xm-companion__header">
          <div className="xm-companion__header-left">
            <div className="xm-companion__avatar">
              <Bot className="w-4 h-4" />
            </div>
            <div className="xm-companion__header-text">
              <span className="xm-companion__header-title">
                {t('video.companion.title')}
              </span>
              <span className="xm-companion__header-subtitle">
                {t('video.companion.subtitle')}
              </span>
            </div>
          </div>
          <div className="xm-companion__header-actions">
            <button
              className="xm-companion__header-btn"
              onClick={toggleEvidence}
              title={t('video.companion.evidence')}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              className="xm-companion__header-btn"
              onClick={toggleHistory}
              title={t('video.companion.history')}
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 上下文锚点 */}
        <div className="xm-companion__anchor">
          <Link className="w-3.5 h-3.5 shrink-0" />
          <span className="xm-companion__anchor-text">
            {t('video.companion.anchorLabel', { anchor: 'T=02:15 / Scene-02' })}
          </span>
          <button className="xm-companion__anchor-close">
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* 聊天气泡区（占位） */}
        <div className="xm-companion__chat">
          {/* 用户气泡 */}
          <div className="xm-companion__bubble xm-companion__bubble--user">
            <div className="xm-companion__bubble-content xm-companion__bubble-content--user">
              这块没听懂，积分为什么能等于面积？
            </div>
          </div>

          {/* AI 气泡 */}
          <div className="xm-companion__bubble xm-companion__bubble--ai">
            <div className="xm-companion__agent-label">
              <div className="xm-companion__agent-avatar">严</div>
              <span className="xm-companion__agent-name">严谨教授</span>
            </div>
            <div className="xm-companion__bubble-content xm-companion__bubble-content--ai">
              好问题！这正是微积分的魅力。
              <br /><br />
              你可以把不规则的面积想象成无数个<strong>"极细的矩形"</strong>拼成的：
              <br />
              1. 每个矩形的宽度是无限小的 <code>dx</code>。
              <br />
              2. 每个矩形的高度是函数在该点的值 <code>f(x)</code>。
              <br /><br />
              当把所有矩形的面积加起来，取极限，就变成了这条曲线下的精确面积。
            </div>
          </div>
        </div>

        {/* 底部输入区 */}
        <div className="xm-companion__input-area">
          <div className="xm-companion__quick-tags">
            <button className="xm-companion__quick-tag">
              <HelpCircle className="w-3 h-3" />
              {t('video.companion.quickNotUnderstand')}
            </button>
            <button className="xm-companion__quick-tag">
              <AlertCircle className="w-3 h-3" />
              {t('video.companion.quickExample')}
            </button>
            <button className="xm-companion__quick-tag">
              <Rocket className="w-3 h-3" />
              {t('video.companion.quickExtend')}
            </button>
          </div>

          <div className="xm-companion__input-box">
            <textarea
              className="xm-companion__textarea"
              rows={2}
              placeholder={t('video.companion.inputPlaceholder')}
              readOnly
            />
            <div className="xm-companion__input-footer">
              <div className="xm-companion__input-meta">
                <button className="xm-companion__input-clear">
                  {t('video.companion.clear')}
                </button>
                <div className="w-1 h-1 rounded-full bg-border" />
                <span className="xm-companion__input-count">
                  {t('video.companion.charCount', { count: 0 })}
                </span>
              </div>
              <button className="xm-companion__send-btn">
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 历史抽屉 */}
        <div
          className={cn(
            'xm-companion__drawer',
            historyOpen && 'xm-companion__drawer--open',
          )}
        >
          <div className="xm-companion__drawer-header">
            <span className="xm-companion__drawer-title">
              {t('video.companion.historyTitle')}
            </span>
            <button className="xm-companion__drawer-close" onClick={toggleHistory}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="xm-companion__drawer-body">
            <p className="text-sm text-muted-foreground text-center py-8">
              暂无历史记录
            </p>
          </div>
        </div>

        {/* 证据抽屉 */}
        <div
          className={cn(
            'xm-companion__drawer',
            evidenceOpen && 'xm-companion__drawer--open',
          )}
        >
          <div className="xm-companion__drawer-header">
            <span className="xm-companion__drawer-title">
              {t('video.companion.evidenceTitle')}
            </span>
            <button className="xm-companion__drawer-close" onClick={toggleEvidence}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="xm-companion__drawer-body">
            <p className="text-sm text-muted-foreground text-center py-8">
              暂无依据数据
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
