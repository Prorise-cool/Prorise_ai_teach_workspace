/**
 * 文件说明：公开营销落地页联系表单。
 * 负责表单校验、匿名线索提交、提交反馈与成功后的重置策略。
 */
import { useMemo, useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Goal, Phone, Mail, Clock3 } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { appI18n } from '@/app/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	landingLeadApi,
	type CreateLandingLeadInput
} from '@/features/home/api/landing-lead-api';
import {
	createLandingContactFormSchema,
	type LandingContactFormValues
} from '@/features/home/schemas/landing-contact-form-schema';
import { cn } from '@/lib/utils';
import { useFeedback } from '@/shared/feedback';
import { resolveLandingLocale, type LandingLocale } from '@/features/home/shared/landing-utils';

type ContactInfo = {
	locationTitle: string;
	locationValue: string;
	phoneTitle: string;
	phoneValue: string;
	mailTitle: string;
	mailValue: string;
	visitTitle: string;
	visitValue1: string;
	visitValue2: string;
};

type LandingContactSubmissionState = 'idle' | 'success' | 'error';

type LandingContactFeedbackCopy = {
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
function resolveLandingContactFeedbackCopy(
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
function mapLandingContactFormToLeadInput(
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
function resolveLandingContactFeedbackMessage(
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
function createLandingContactDefaultValues(
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

/**
 * 渲染落地页联系区块，并接入真实线索提交链路。
 *
 * @returns 落地页联系区块节点。
 */
export function LandingContact() {
	const { t } = useAppTranslation();
	const { notify } = useFeedback();
	const currentLocale = resolveLandingLocale(appI18n.resolvedLanguage);

	const contactInfo = t('landing.contact.info', {
		returnObjects: true
	}) as ContactInfo;
	const contactSubjectOptions = t('landing.contact.form.subjectOptions', {
		returnObjects: true
	}) as string[];
	const defaultContactSubject = contactSubjectOptions[0] ?? '';
	const contactFormSchema = useMemo(() => createLandingContactFormSchema(t), [t]);
	const contactFeedbackCopy = useMemo(
		() => resolveLandingContactFeedbackCopy(currentLocale),
		[currentLocale]
	);
	const defaultFormValues = useMemo(
		() => createLandingContactDefaultValues(defaultContactSubject),
		[defaultContactSubject]
	);

	const [contactSubmissionState, setContactSubmissionState] =
		useState<LandingContactSubmissionState>('idle');
	const [contactSubmissionMessage, setContactSubmissionMessage] = useState('');
	const {
		control,
		register,
		handleSubmit,
		reset,
		setValue,
		formState: {
			errors: contactFormErrors,
			submitCount: contactSubmitCount
		}
	} = useForm<LandingContactFormValues>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: defaultFormValues,
		mode: 'onSubmit',
		reValidateMode: 'onChange'
	});

	const currentContactSubject = useWatch({
		control,
		name: 'subject'
	});
	const submitLandingLeadMutation = useMutation({
		mutationFn: async (input: CreateLandingLeadInput) =>
			landingLeadApi.submitLead(input)
	});
	const showContactFormError =
		contactSubmitCount > 0 && Object.keys(contactFormErrors).length > 0;

	useEffect(() => {
		if (contactSubjectOptions.includes(currentContactSubject)) {
			return;
		}

		setValue('subject', defaultContactSubject, {
			shouldDirty: false,
			shouldTouch: false,
			shouldValidate: false
		});
	}, [
		contactSubjectOptions,
		currentContactSubject,
		defaultContactSubject,
		setValue
	]);

	const submitContactForm = handleSubmit(async values => {
		if (submitLandingLeadMutation.isPending) {
			return;
		}

		setContactSubmissionState('idle');
		setContactSubmissionMessage('');

		try {
			const result = await submitLandingLeadMutation.mutateAsync(
				mapLandingContactFormToLeadInput(values, currentLocale)
			);
			const feedbackMessage = resolveLandingContactFeedbackMessage(
				result.message,
				result.accepted
					? contactFeedbackCopy.successDescription
					: contactFeedbackCopy.errorDescription
			);

			if (!result.accepted) {
				setContactSubmissionState('error');
				setContactSubmissionMessage(feedbackMessage);
				notify({
					tone: 'warning',
					title: contactFeedbackCopy.errorTitle,
					description: feedbackMessage
				});
				return;
			}

			reset(defaultFormValues);
			setContactSubmissionState('success');
			setContactSubmissionMessage(feedbackMessage);
			notify({
				tone: 'success',
				title: contactFeedbackCopy.successTitle,
				description: feedbackMessage
			});
		} catch {
			setContactSubmissionState('error');
			setContactSubmissionMessage(contactFeedbackCopy.errorDescription);
			notify({
				tone: 'warning',
				title: contactFeedbackCopy.errorTitle,
				description: contactFeedbackCopy.errorDescription
			});
		}
	});

	return (
		<section id="contact" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-2">
				<div>
					<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
						{t('landing.contact.eyebrow')}
					</h2>
					<h3 className="text-4xl font-bold">{t('landing.contact.title')}</h3>
					<p className="mb-8 mt-4 max-w-xl text-muted-foreground">
						{t('landing.contact.description')}
					</p>

					<div className="flex flex-col gap-5">
						<div>
							<div className="mb-1 flex items-center gap-2 font-bold">
								<Goal className="h-5 w-5" />
								{contactInfo.locationTitle}
							</div>
							<div>{contactInfo.locationValue}</div>
						</div>

						<div>
							<div className="mb-1 flex items-center gap-2 font-bold">
								<Phone className="h-5 w-5" />
								{contactInfo.phoneTitle}
							</div>
							<div>{contactInfo.phoneValue}</div>
						</div>

						<div>
							<div className="mb-1 flex items-center gap-2 font-bold">
								<Mail className="h-5 w-5" />
								{contactInfo.mailTitle}
							</div>
							<div>{contactInfo.mailValue}</div>
						</div>

						<div>
							<div className="mb-1 flex items-center gap-2 font-bold">
								<Clock3 className="h-5 w-5" />
								{contactInfo.visitTitle}
							</div>
							<div>{contactInfo.visitValue1}</div>
							<div>{contactInfo.visitValue2}</div>
						</div>
					</div>
				</div>

				<div className="rounded-[var(--xm-radius-lg)] border border-border bg-muted/60 p-6">
					<form
						className="grid gap-4"
						aria-busy={submitLandingLeadMutation.isPending}
						noValidate
						onSubmit={event => {
							void submitContactForm(event);
						}}
					>
						<div className="flex flex-col gap-4 md:flex-row">
							<div className="flex w-full flex-col gap-1.5">
								<Label
									className="text-sm font-medium"
									htmlFor="contact-first-name"
								>
									{t('landing.contact.form.firstName')}
								</Label>
								<Input
									id="contact-first-name"
									placeholder={t('landing.contact.form.firstNamePlaceholder')}
									aria-invalid={Boolean(contactFormErrors.firstName)}
									disabled={submitLandingLeadMutation.isPending}
									{...register('firstName')}
								/>

								{contactFormErrors.firstName?.message ? (
									<p className="text-sm text-destructive">
										{contactFormErrors.firstName.message}
									</p>
								) : null}
							</div>

							<div className="flex w-full flex-col gap-1.5">
								<Label
									className="text-sm font-medium"
									htmlFor="contact-last-name"
								>
									{t('landing.contact.form.lastName')}
								</Label>
								<Input
									id="contact-last-name"
									placeholder={t('landing.contact.form.lastNamePlaceholder')}
									disabled={submitLandingLeadMutation.isPending}
									{...register('lastName')}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-sm font-medium" htmlFor="contact-email">
								{t('landing.contact.form.email')}
							</Label>
							<Input
								id="contact-email"
								type="email"
								placeholder={t('landing.contact.form.emailPlaceholder')}
								aria-invalid={Boolean(contactFormErrors.email)}
								disabled={submitLandingLeadMutation.isPending}
								{...register('email')}
							/>

							{contactFormErrors.email?.message ? (
								<p className="text-sm text-destructive">
									{contactFormErrors.email.message}
								</p>
							) : null}
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-sm font-medium" htmlFor="contact-subject">
								{t('landing.contact.form.subject')}
							</Label>
							<select
								id="contact-subject"
								className="xm-landing-field"
								aria-invalid={Boolean(contactFormErrors.subject)}
								disabled={submitLandingLeadMutation.isPending}
								{...register('subject')}
							>
								{contactSubjectOptions.map(option => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>

							{contactFormErrors.subject?.message ? (
								<p className="text-sm text-destructive">
									{contactFormErrors.subject.message}
								</p>
							) : null}
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-sm font-medium" htmlFor="contact-message">
								{t('landing.contact.form.message')}
							</Label>
							<Textarea
								id="contact-message"
								rows={5}
								className="min-h-[120px] resize-y"
								placeholder={t('landing.contact.form.messagePlaceholder')}
								aria-invalid={Boolean(contactFormErrors.message)}
								disabled={submitLandingLeadMutation.isPending}
								{...register('message')}
							/>

							{contactFormErrors.message?.message ? (
								<p className="text-sm text-destructive">
									{contactFormErrors.message.message}
								</p>
							) : null}
						</div>

						{showContactFormError ? (
							<div className="xm-landing-contact-alert rounded-[var(--xm-radius-lg)] border border-destructive/40 px-4 py-3">
								<div className="font-semibold text-destructive">
									{t('landing.contact.form.errorTitle')}
								</div>
								<div className="mt-1 text-sm text-muted-foreground">
									{t('landing.contact.form.errorDescription')}
								</div>
							</div>
						) : null}

						{contactSubmissionState !== 'idle' ? (
							<div
								role={
									contactSubmissionState === 'success' ? 'status' : 'alert'
								}
								className={cn(
									'xm-landing-contact-alert rounded-[var(--xm-radius-lg)] px-4 py-3',
									contactSubmissionState === 'success'
										? 'border border-primary/40 bg-primary/5'
										: 'border border-destructive/40'
								)}
							>
								<div
									className={cn(
										'font-semibold',
										contactSubmissionState === 'success'
											? 'text-primary'
											: 'text-destructive'
									)}
								>
									{contactSubmissionState === 'success'
										? contactFeedbackCopy.successTitle
										: contactFeedbackCopy.errorTitle}
								</div>
								<div className="mt-1 text-sm text-muted-foreground">
									{contactSubmissionMessage}
								</div>
							</div>
						) : null}

						<Button
							type="submit"
							size="lg"
							className="mt-4"
							disabled={submitLandingLeadMutation.isPending}
						>
							{submitLandingLeadMutation.isPending
								? contactFeedbackCopy.submittingLabel
								: t('landing.contact.form.button')}
						</Button>
					</form>
				</div>
			</div>
		</section>
	);
}
