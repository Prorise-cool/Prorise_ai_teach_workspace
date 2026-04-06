/**
 * 文件说明：视频输入页表单校验 schema。
 */
import { z } from 'zod';

import {
  VIDEO_IMAGE_ACCEPTED_TYPES,
  VIDEO_IMAGE_MAX_SIZE_BYTES,
  VIDEO_TEXT_MAX_LENGTH,
  VIDEO_TEXT_MIN_LENGTH,
} from '@/types/video';

export const VIDEO_INPUT_ACCEPTED_IMAGE_TYPES = VIDEO_IMAGE_ACCEPTED_TYPES;
export const VIDEO_INPUT_MAX_IMAGE_SIZE = VIDEO_IMAGE_MAX_SIZE_BYTES;

export const videoInputFormSchema = z
  .object({
    inputType: z.enum(['text', 'image']),
    text: z.string(),
    imageFile: z.instanceof(File).nullable(),
  })
  .superRefine((data, ctx) => {
    const trimmedText = data.text.trim();

    if (data.inputType === 'text') {
      if (trimmedText.length < VIDEO_TEXT_MIN_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          message: `请输入至少 ${VIDEO_TEXT_MIN_LENGTH} 个字符的题目描述`,
          path: ['text'],
        });
      }
    }

    if (trimmedText.length > VIDEO_TEXT_MAX_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `输入内容不能超过 ${VIDEO_TEXT_MAX_LENGTH} 个字符`,
        path: ['text'],
      });
    }

    if (data.inputType === 'image') {
      if (!data.imageFile) {
        ctx.addIssue({
          code: 'custom',
          message: '请上传一张图片作为输入',
          path: ['imageFile'],
        });
        return;
      }

      if (!VIDEO_INPUT_ACCEPTED_IMAGE_TYPES.includes(data.imageFile.type as never)) {
        ctx.addIssue({
          code: 'custom',
          message: '仅支持 JPG、PNG、WebP 格式的图片',
          path: ['imageFile'],
        });
      }

      if (data.imageFile.size > VIDEO_INPUT_MAX_IMAGE_SIZE) {
        ctx.addIssue({
          code: 'custom',
          message: '图片大小不能超过 10MB',
          path: ['imageFile'],
        });
      }
    }
  });

export type VideoInputFormValues = {
  inputType: 'text' | 'image';
  text: string;
  imageFile: File | null;
};
