import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VideoPreviewSectionStatus } from '@/types/video';

const STATUS_CLASS_NAME: Record<VideoPreviewSectionStatus, string> = {
  pending: 'border-border/70 bg-background/60 text-muted-foreground',
  generating: 'border-primary/25 bg-primary/10 text-primary',
  rendering: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  fixing: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ready: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'border-destructive/25 bg-destructive/10 text-destructive',
};

export interface VideoPreviewSectionBadgeProps {
  status: VideoPreviewSectionStatus;
  className?: string;
}

export function VideoPreviewSectionBadge({
  status,
  className,
}: VideoPreviewSectionBadgeProps) {
  const { t } = useAppTranslation();

  return (
    <Badge
      variant="outline"
      className={cn('rounded-full text-[11px] font-semibold', STATUS_CLASS_NAME[status], className)}
    >
      {t(`video.generating.sectionStatus.${status}`)}
    </Badge>
  );
}
