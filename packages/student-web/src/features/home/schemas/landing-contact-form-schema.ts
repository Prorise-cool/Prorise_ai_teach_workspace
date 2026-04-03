/**
 * 文件说明：营销落地页联系表单 schema。
 * 统一定义联系表单字段校验规则，避免页面组件内手写校验分支。
 */
import type { TFunction } from 'i18next';
import { z } from 'zod';

export type LandingContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};

/**
 * 创建联系表单校验 schema。
 *
 * @param t - 国际化翻译函数。
 * @returns 联系表单 Zod schema。
 */
export function createLandingContactFormSchema(t: TFunction) {
  return z.object({
    firstName: z
      .string()
      .trim()
      .min(1, t('landing.contact.form.validation.firstNameRequired')),
    lastName: z.string().trim(),
    email: z
      .string()
      .trim()
      .min(1, t('landing.contact.form.validation.emailRequired'))
      .email(t('landing.contact.form.validation.emailInvalid')),
    subject: z
      .string()
      .trim()
      .min(1, t('landing.contact.form.validation.subjectRequired')),
    message: z
      .string()
      .trim()
      .min(1, t('landing.contact.form.validation.messageRequired'))
  });
}
