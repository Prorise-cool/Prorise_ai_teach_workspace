/**
 * 文件说明：落地页联系表单的辅助函数。
 * 包含本地化反馈文案、表单值映射和默认值创建。
 */
import type {
	CreateLandingLeadInput
} from '@/features/home/api/landing-lead-api';
import {
	type LandingContactFormValues
} from '@/features/home/schemas/landing-contact-form-schema';
import { type LandingLocale } from '@/features/home/shared/landing-utils';

export type LandingContactFeedbackCopy = {
	submittingLabel: string;
	successTitle: string;
	successDescription: string;
	errorTitle: string;
	errorDescription: string;
};

/**
 * 返回落地页联系表单的本地反馈文案。
 *
 * @param locale - 当前页面语言。
 * @returns 提交中、成功、失败反馈文案。
 */
export function resolveLandingContactFeedbackCopy(
	locale: LandingLocale
): LandingContactFeedbackCopy {
	if (locale === 'en-US') {
		return {
			submittingLabel: 'Submitting...',
			successTitle: 'Request sent',
			successDescription:
				'We have received your message and will get back to you soon.',
			errorTitle: 'Submission failed',
			errorDescription:
				'Your message was not submitted. Please try again in a moment.'
		};
	}

	return {
		submittingLabel: '提交中...',
		successTitle: '提交成功',
		successDescription: '我们已收到你的信息，会尽快与你联系。',
		errorTitle: '提交失败',
		errorDescription: '本次提交未成功，请稍后重试。'
	};
}

/**
 * 将联系表单值映射为落地页线索接口 payload。
 *
 * @param values - 表单值。
 * @param locale - 当前页面语言。
 * @returns 落地页线索提交参数。
 */
export function mapLandingContactFormToLeadInput(
	values: LandingContactFormValues,
	locale: LandingLocale
): CreateLandingLeadInput {
	return {
		contactName: values.firstName.trim(),
		organizationName: values.lastName.trim() || undefined,
		contactEmail: values.email.trim(),
		subject: values.subject.trim(),
		message: values.message.trim(),
		sourcePage: '/landing',
		sourceLocale: locale
	};
}

/**
 * 优先使用接口返回文案；若为空则回退到本地提示。
 *
 * @param message - 接口返回文案。
 * @param fallback - 本地兜底文案。
 * @returns 可展示的反馈描述。
 */
export function resolveLandingContactFeedbackMessage(
	message: string,
	fallback: string
) {
	const normalizedMessage = message.trim();

	return normalizedMessage.length > 0 ? normalizedMessage : fallback;
}

/**
 * 创建联系表单的默认值，避免初始化与成功重置发生漂移。
 *
 * @param defaultContactSubject - 默认咨询主题。
 * @returns 联系表单默认值。
 */
export function createLandingContactDefaultValues(
	defaultContactSubject: string
): LandingContactFormValues {
	return {
		firstName: '',
		lastName: '',
		email: '',
		subject: defaultContactSubject,
		message: ''
	};
}
