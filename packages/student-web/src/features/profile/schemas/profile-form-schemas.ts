/**
 * 文件说明：定义用户配置引导表单的验证 schema。
 * 当前主要承接个人简介页的长度校验与偏好页的数据结构约束。
 */
import type { TFunction } from 'i18next';
import { z } from 'zod';

import {
  PERSONALITY_TYPES,
  PROFILE_BIO_MAX_LENGTH,
  TEACHER_TAGS,
  type PersonalityType,
  type TeacherTag
} from '@/features/profile/types';

export type ProfileIntroFormValues = {
  bio: string;
};

export type ProfilePreferencesFormValues = {
  personalityType: PersonalityType | null;
  teacherTags: TeacherTag[];
};

/**
 * 创建个人简介页校验 schema。
 *
 * @param t - i18n 翻译函数。
 * @returns Zod schema。
 */
export function createProfileIntroSchema(t: TFunction) {
  return z.object({
    bio: z
      .string()
      .max(
        PROFILE_BIO_MAX_LENGTH,
        t('profileSetup.validation.bioTooLong', {
          max: PROFILE_BIO_MAX_LENGTH
        })
      )
  });
}

/**
 * 创建偏好页数据结构 schema。
 *
 * @returns Zod schema。
 */
export function createProfilePreferencesSchema() {
  return z.object({
    personalityType: z.enum(PERSONALITY_TYPES).nullable(),
    teacherTags: z.array(z.enum(TEACHER_TAGS))
  });
}
