/**
 * 文件说明：视频输入页表单校验 schema。
 */
import { z } from 'zod';

import {
  VIDEO_DEFAULT_QUALITY_PRESET,
  VIDEO_IMAGE_ACCEPTED_TYPES,
  VIDEO_IMAGE_MAX_SIZE_BYTES,
  VIDEO_LAYOUT_HINT_VALUES,
  VIDEO_QUALITY_PRESET_VALUES,
  VIDEO_RENDER_QUALITY_VALUES,
  VIDEO_TEXT_MAX_LENGTH,
  VIDEO_TEXT_MIN_LENGTH,
} from '@/types/video';

export const VIDEO_INPUT_ACCEPTED_IMAGE_TYPES = VIDEO_IMAGE_ACCEPTED_TYPES;
export const VIDEO_INPUT_MAX_IMAGE_SIZE = VIDEO_IMAGE_MAX_SIZE_BYTES;

export type VideoInputValidationMessages = {
  durationRange: string;
  sectionCountRange: string;
  sectionConcurrencyRange: string;
  textMin: string;
  textMax: string;
  imageRequired: string;
  imageType: string;
  imageSize: string;
};

const defaultValidationMessages: VideoInputValidationMessages = {
  durationRange: '时长需在 1-10 分钟之间',
  sectionCountRange: '分段数需在 1-12 段之间',
  sectionConcurrencyRange: '并发数需在 1-8 之间',
  textMin: `请输入至少 ${VIDEO_TEXT_MIN_LENGTH} 个字符的题目描述`,
  textMax: `输入内容不能超过 ${VIDEO_TEXT_MAX_LENGTH} 个字符`,
  imageRequired: '请上传至少一张图片作为输入',
  imageType: '仅支持 JPG、PNG、WebP 格式的图片',
  imageSize: '图片大小不能超过 30MB',
};

export function createVideoInputFormSchema(
  messages: Partial<VideoInputValidationMessages> = {},
) {
  const resolvedMessages = {
    ...defaultValidationMessages,
    ...messages,
  };

  return z
    .object({
      inputType: z.enum(['text', 'image']),
      text: z.string(),
      imageFiles: z.array(z.instanceof(File)),
      qualityPreset: z.enum(VIDEO_QUALITY_PRESET_VALUES),
      durationMinutes: z.number().int().min(1, resolvedMessages.durationRange).max(10, resolvedMessages.durationRange),
      sectionCount: z.number().int().min(1, resolvedMessages.sectionCountRange).max(12, resolvedMessages.sectionCountRange),
      sectionConcurrency: z.number().int().min(1, resolvedMessages.sectionConcurrencyRange).max(8, resolvedMessages.sectionConcurrencyRange),
      renderQuality: z.enum(VIDEO_RENDER_QUALITY_VALUES),
      layoutHint: z.enum(VIDEO_LAYOUT_HINT_VALUES),
    })
    .superRefine((data, ctx) => {
      const trimmedText = data.text.trim();

      if (data.inputType === 'text' && trimmedText.length < VIDEO_TEXT_MIN_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          message: resolvedMessages.textMin,
          path: ['text'],
        });
      }

      if (trimmedText.length > VIDEO_TEXT_MAX_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          message: resolvedMessages.textMax,
          path: ['text'],
        });
      }

      if (data.inputType !== 'image') {
        return;
      }

      if (data.imageFiles.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: resolvedMessages.imageRequired,
          path: ['imageFiles'],
        });
        return;
      }

      for (const file of data.imageFiles) {
        if (!VIDEO_INPUT_ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
          ctx.addIssue({
            code: 'custom',
            message: resolvedMessages.imageType,
            path: ['imageFiles'],
          });
          break;
        }

        if (file.size > VIDEO_INPUT_MAX_IMAGE_SIZE) {
          ctx.addIssue({
            code: 'custom',
            message: resolvedMessages.imageSize,
            path: ['imageFiles'],
          });
          break;
        }
      }
    });
}

export const videoInputFormSchema = createVideoInputFormSchema();

export type VideoInputFormValues = z.infer<typeof videoInputFormSchema>;
