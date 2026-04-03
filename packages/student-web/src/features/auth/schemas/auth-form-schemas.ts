/**
 * 文件说明：认证页表单 schema。
 * 统一定义登录 / 注册字段校验规则，避免表单组件各自散落校验逻辑。
 */
import type { TFunction } from 'i18next';
import { z } from 'zod';

export type LoginFormValues = {
  username: string;
  password: string;
  code: string;
  rememberSession: boolean;
};

export type RegisterFormValues = {
  username: string;
  password: string;
  confirmPassword: string;
  code: string;
  agreeToTerms: boolean;
};

export function createLoginFormSchema(t: TFunction) {
  return z.object({
    username: z
      .string()
      .trim()
      .min(1, t('auth.validation.login.usernameRequired')),
    password: z
      .string()
      .min(1, t('auth.validation.login.passwordRequired')),
    code: z.string(),
    rememberSession: z.boolean()
  });
}

export function createRegisterFormSchema(t: TFunction) {
  return z
    .object({
      username: z
        .string()
        .trim()
        .min(1, t('auth.validation.register.usernameRequired'))
        .min(2, t('auth.validation.register.usernameTooShort'))
        .max(30, t('auth.validation.register.usernameTooLong')),
      password: z
        .string()
        .min(1, t('auth.validation.register.passwordRequired'))
        .min(5, t('auth.validation.register.passwordTooShort'))
        .max(30, t('auth.validation.register.passwordTooLong')),
      confirmPassword: z
        .string()
        .min(1, t('auth.validation.register.confirmPasswordRequired')),
      code: z.string(),
      agreeToTerms: z
        .boolean()
        .refine(value => value, t('auth.validation.register.agreeToTerms'))
    })
    .superRefine((values, context) => {
      if (values.password !== values.confirmPassword) {
        context.addIssue({
          code: 'custom',
          path: ['confirmPassword'],
          message: t('auth.validation.register.passwordMismatch')
        });
      }
    });
}
