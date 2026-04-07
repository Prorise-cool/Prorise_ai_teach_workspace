/**
 * 文件说明：视频结果页发布状态横幅条组件。
 * 仅在视频已公开发布时显示，提供"复制公开链接"和"取消公开"操作。
 */
import { Loader2, Share2 } from 'lucide-react';
import { useCallback } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { useFeedback } from '@/shared/feedback';

export interface PublishBannerProps {
  /** 取消公开操作进行中。 */
  unpublishLoading?: boolean;
  /** 点击取消公开。 */
  onUnpublish?: () => void;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染发布状态横幅。
 *
 * @param props - 横幅属性。
 * @returns 横幅 UI。
 */
export function PublishBanner({
  unpublishLoading = false,
  onUnpublish,
  className,
}: PublishBannerProps) {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify({ tone: 'success', title: t('video.result.copyLinkSuccess') });
    } catch {
      notify({ tone: 'error', title: t('video.result.copyLinkFailed') });
    }
  }, [notify, t]);

  return (
    <div className={cn('xm-publish-banner', className)}>
      <div className="xm-publish-banner__card">
        <div className="xm-publish-banner__info">
          <div className="xm-publish-banner__icon-wrap">
            <Share2 className="w-[18px] h-[18px] text-primary" />
          </div>
          <div className="xm-publish-banner__text-group">
            <div className="xm-publish-banner__title-row">
              <p className="xm-publish-banner__title">
                {t('video.result.publishBannerTitle')}
              </p>
              <span className="xm-publish-banner__tag">
                {t('video.result.publishBannerTag')}
              </span>
            </div>
            <p className="xm-publish-banner__desc">
              {t('video.result.publishBannerDesc')}
            </p>
          </div>
        </div>
        <div className="xm-publish-banner__actions">
          <button
            className="xm-publish-banner__btn xm-publish-banner__btn--outline"
            onClick={() => void handleCopyLink()}
          >
            {t('video.result.copyPublicLink')}
          </button>
          <button
            className="xm-publish-banner__btn xm-publish-banner__btn--danger"
            onClick={onUnpublish}
            disabled={unpublishLoading}
          >
            {unpublishLoading && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
            {t('video.result.cancelPublish')}
          </button>
        </div>
      </div>
    </div>
  );
}
