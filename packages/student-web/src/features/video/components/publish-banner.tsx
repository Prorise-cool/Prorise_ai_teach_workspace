/**
 * 文件说明：视频结果页公开状态卡。
 * 放在进度条下方、视频舞台上方，用于展示真实公开链接与发布动作。
 */
import { Globe2, Loader2, LockKeyhole, Share2, X } from 'lucide-react';
import { useCallback } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { useFeedback } from '@/shared/feedback';

export interface PublishBannerProps {
  /** 是否已公开。 */
  published?: boolean;
  /** 真实公开链接。 */
  publicUrl?: string | null;
  /** 发布/取消公开操作是否进行中。 */
  publishLoading?: boolean;
  /** 点击公开发布。 */
  onPublish?: () => void;
  /** 点击取消公开。 */
  onUnpublish?: () => void;
  /** 关闭 banner 回调。 */
  onDismiss?: () => void;
  /** 是否只读展示（公开详情页）。 */
  readOnly?: boolean;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染发布状态卡。
 *
 * @param props - 状态卡属性。
 * @returns 状态卡 UI。
 */
export function PublishBanner({
  published = false,
  publicUrl,
  publishLoading = false,
  onPublish,
  onUnpublish,
  onDismiss,
  readOnly = false,
  className,
}: PublishBannerProps) {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const normalizedPublicUrl = publicUrl?.trim() || '';

  const handleCopyLink = useCallback(async () => {
    if (!normalizedPublicUrl) {
      notify({ tone: 'error', title: t('video.result.copyLinkFailed') });
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedPublicUrl);
      notify({ tone: 'success', title: t('video.result.copyLinkSuccess') });
    } catch {
      notify({ tone: 'error', title: t('video.result.copyLinkFailed') });
    }
  }, [normalizedPublicUrl, notify, t]);

  return (
    <div className={cn('xm-publish-banner', className)}>
      <div className="xm-publish-banner__card">
        <div className="xm-publish-banner__info">
          <div className="xm-publish-banner__icon-wrap">
            {published ? (
              <Globe2 className="w-[18px] h-[18px] text-primary" />
            ) : (
              <LockKeyhole className="w-[18px] h-[18px] text-primary" />
            )}
          </div>
          <div className="xm-publish-banner__text-group">
            <div className="xm-publish-banner__title-row">
              <p className="xm-publish-banner__title">
                {t('video.result.publishBannerTitle')}
              </p>
              <span className="xm-publish-banner__tag">
                {published
                  ? t('video.result.statusPublished')
                  : t('video.result.statusPrivate')}
              </span>
            </div>
            <p className="xm-publish-banner__desc">
              {published
                ? t('video.result.publishBannerDesc')
                : t('video.result.publishBannerPrivateDesc')}
            </p>
          </div>
        </div>
        <div className="xm-publish-banner__right">
          <div className="xm-publish-banner__actions">
            {published && normalizedPublicUrl ? (
              <button
                className="xm-publish-banner__btn xm-publish-banner__btn--outline"
                onClick={() => void handleCopyLink()}
              >
                <Share2 className="w-3.5 h-3.5" />
                {t('video.result.copyPublicLink')}
              </button>
            ) : null}

            {!readOnly && !published ? (
              <button
                className="xm-publish-banner__btn xm-publish-banner__btn--primary"
                onClick={onPublish}
                disabled={publishLoading}
              >
                {publishLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {t('video.result.publishAction')}
              </button>
            ) : null}

            {!readOnly && published ? (
              <button
                className="xm-publish-banner__btn xm-publish-banner__btn--danger"
                onClick={onUnpublish}
                disabled={publishLoading}
              >
                {publishLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {t('video.result.cancelPublish')}
              </button>
            ) : null}
          </div>
          {onDismiss ? (
            <button
              className="xm-publish-banner__dismiss"
              onClick={onDismiss}
              aria-label={t('video.result.dismissBanner')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
