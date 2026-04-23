/**
 * 文件说明：视频输入卡片 — 图片预览网格（从 video-input-card 拆分，wave-1.5 polish）。
 */
import { X } from 'lucide-react';
import type { FC } from 'react';

type VideoInputMediaPreviewProps = {
  imageFiles: readonly File[];
  previewUrls: readonly string[];
  onRemove: (index: number) => void;
  blockPrefix: string;
  removeLabel: string;
};

export const VideoInputMediaPreview: FC<VideoInputMediaPreviewProps> = ({
  imageFiles,
  previewUrls,
  onRemove,
  blockPrefix,
  removeLabel,
}) => {
  if (imageFiles.length === 0) {
    return null;
  }

  return (
    <div className={`${blockPrefix}-image-grid`}>
      {imageFiles.map((file, index) => (
        <div
          key={`${file.name}-${file.size}-${index}`}
          className={`${blockPrefix}-image-thumb`}
        >
          <img
            src={previewUrls[index]}
            alt={file.name}
            className={`${blockPrefix}-image-thumb-img`}
          />
          <span className="sr-only">{file.name}</span>
          <button
            type="button"
            className={`${blockPrefix}-image-thumb-remove`}
            onClick={() => onRemove(index)}
            title={removeLabel}
            aria-label={removeLabel}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
