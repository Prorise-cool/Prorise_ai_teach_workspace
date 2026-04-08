/**
 * 文件说明：输入页共享拖拽上传 hook。
 * 负责统一处理课堂页与视频页的拖拽上传、文件筛选与选择器触发逻辑。
 */
import { useCallback, useRef, useState } from 'react';

import { useFeedback } from '@/shared/feedback/feedback-context';

const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const SUPPORTED_FILE_EXTENSIONS = [
  '.md',
  '.txt',
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.doc',
  '.docx',
] as const;

type UseFileDropzoneOptions = {
  /** 是否允许多文件，默认 false（单文件模式）。 */
  multiple?: boolean;
};

/**
 * 提供输入页共享拖拽上传能力。
 *
 * @param options - 可选配置。
 * @returns 拖拽状态、文件列表与选择器交互方法。
 */
export function useFileDropzone(options?: UseFileDropzoneOptions) {
  const { multiple = false } = options ?? {};
  const { notify } = useFeedback();
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleIncomingFiles = useCallback(
    (incoming: File[]) => {
      const accepted: File[] = [];

      for (const file of incoming) {
        const isValid =
          SUPPORTED_FILE_TYPES.some((type) => type === file.type) ||
          SUPPORTED_FILE_EXTENSIONS.some((ext) =>
            file.name.toLowerCase().endsWith(ext),
          );

        if (!isValid) {
          notify({
            title: '不支持的文件格式',
            description: `由于系统限制，我们不支持压缩包或复杂排版文件。无法解析：${file.name}`,
            tone: 'error'
          });
          continue;
        }

        accepted.push(file);
      }

      if (accepted.length === 0) {
        return;
      }

      if (multiple) {
        setAttachedFiles((prev) => [...prev, ...accepted]);
        notify({
          title: '已解析上传附件',
          description: `已准备上传 ${accepted.length} 个文件`,
          tone: 'success'
        });
      } else {
        setAttachedFiles([accepted[0]]);
        notify({
          title: '已解析上传附件',
          description: `已准备上传作为参考：${accepted[0].name}`,
          tone: 'success'
        });
      }
    },
    [multiple, notify],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
        return;
      }

      handleIncomingFiles(Array.from(e.dataTransfer.files));
    },
    [handleIncomingFiles],
  );

  const triggerSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleIncomingFiles(Array.from(files));
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleIncomingFiles]
  );

  const clearFiles = useCallback(() => setAttachedFiles([]), []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* 单文件兼容：课堂页等消费者继续使用 attachedFile / clearFile */
  const attachedFile = attachedFiles[0] ?? null;
  const clearFile = clearFiles;

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    attachedFile,
    attachedFiles,
    clearFile,
    clearFiles,
    removeFile,
    triggerSelect,
    fileInputRef,
    handleFileChange
  };
}
