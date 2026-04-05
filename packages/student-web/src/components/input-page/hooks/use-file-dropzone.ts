import { useCallback, useRef, useState } from 'react';

import { useFeedback } from '@/shared/feedback/feedback-context';

export function useFileDropzone() {
  const { notify } = useFeedback();
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'text/plain',
          'text/markdown',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const validExts = [
          '.md',
          '.txt',
          '.pdf',
          '.jpg',
          '.jpeg',
          '.png',
          '.webp',
          '.doc',
          '.docx'
        ];

        const isValid =
          validTypes.includes(file.type) ||
          validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

        if (!isValid) {
          notify({
            title: '不支持的文件格式',
            description: `由于系统限制，我们不支持压缩包或复杂排版文件。无法解析：${file.name}`,
            tone: 'error'
          });
          return;
        }

        setAttachedFile(file);
        notify({
          title: '已解析上传附件',
          description: `已准备上传作为参考：${file.name}`,
          tone: 'success'
        });
      }
    },
    [notify]
  );

  const triggerSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        // Mock a drop event structure for unified validation
        handleDrop({ 
          preventDefault: () => {}, 
          stopPropagation: () => {}, 
          dataTransfer: { files } 
        } as unknown as React.DragEvent);
      }
      // Reset value so we can select same file again if cleared
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleDrop]
  );

  const clearFile = useCallback(() => setAttachedFile(null), []);

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    attachedFile,
    clearFile,
    triggerSelect,
    fileInputRef,
    handleFileChange
  };
}
