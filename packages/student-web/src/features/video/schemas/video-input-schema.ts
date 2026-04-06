/**
 * 文件说明：视频输入页表单校验 schema。
 * 使用 zod 定义 VideoInputFormSchema，对齐 Story 3.1 冻结的请求字段。
 * 由 react-hook-form + zodResolver 消费，禁止 useState 手写校验。
 */
import { z } from 'zod';

/** 支持的图片 MIME 类型。 */
export const VIDEO_INPUT_ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** 图片最大尺寸（10MB）。 */
export const VIDEO_INPUT_MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** 文本输入最小长度。 */
export const VIDEO_INPUT_MIN_TEXT_LENGTH = 2;

/** 文本输入最大长度。 */
export const VIDEO_INPUT_MAX_TEXT_LENGTH = 5000;

/**
 * 视频输入表单的 zod schema。
 *
 * @remarks
 * inputType 为 'text' 时 text 必填；
 * inputType 为 'image' 时 imageFile 必填。
 * superRefine 负责跨字段联合校验。
 */
export const videoInputFormSchema = z
  .object({
    /** 输入类型：纯文本或图片附件。 */
    inputType: z.enum(['text', 'image']),
    /** 文本输入内容。 */
    text: z.string().trim(),
    /** 附件图片文件（仅图片模式）。 */
    imageFile: z.instanceof(File).nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.inputType === 'text') {
      if (!data.text || data.text.length < VIDEO_INPUT_MIN_TEXT_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          message: `请输入至少 ${VIDEO_INPUT_MIN_TEXT_LENGTH} 个字符的题目描述`,
          path: ['text'],
        });
      }

      if (data.text && data.text.length > VIDEO_INPUT_MAX_TEXT_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          message: `输入内容不能超过 ${VIDEO_INPUT_MAX_TEXT_LENGTH} 个字符`,
          path: ['text'],
        });
      }
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

      const acceptedTypes = VIDEO_INPUT_ACCEPTED_IMAGE_TYPES as readonly string[];
      if (!acceptedTypes.includes(data.imageFile.type)) {
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

/** 视频输入表单值类型（显式定义，避免 zod v4 default() 导致的可选推断问题）。 */
export type VideoInputFormValues = {
  inputType: 'text' | 'image';
  text: string;
  imageFile: File | null;
};
