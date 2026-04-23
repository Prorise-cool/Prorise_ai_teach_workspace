/**
 * 文件说明：落地页联系表单提交 hook。
 * 封装表单状态管理、校验、匿名线索提交、提交反馈与重置策略。
 */
import { useMemo, useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { appI18n } from '@/app/i18n';
import {
	landingLeadApi,
	type CreateLandingLeadInput
} from '@/features/home/api/landing-lead-api';
import {
	createLandingContactFormSchema,
	type LandingContactFormValues
} from '@/features/home/schemas/landing-contact-form-schema';
import { useFeedback } from '@/shared/feedback';
import { resolveLandingLocale } from '@/features/home/shared/landing-utils';
import {
	resolveLandingContactFeedbackCopy,
	mapLandingContactFormToLeadInput,
	resolveLandingContactFeedbackMessage,
	createLandingContactDefaultValues,
	type LandingContactFeedbackCopy,
} from '../components/landing-contact/landing-contact-helpers';

type ContactSubjectOptions = string[];

type LandingContactSubmissionState = 'idle' | 'success' | 'error';

export type UseLandingContactSubmitReturn = {
	control: ReturnType<typeof useForm<LandingContactFormValues>>['control'];
	register: ReturnType<typeof useForm<LandingContactFormValues>>['register'];
	contactFormErrors: ReturnType<typeof useForm<LandingContactFormValues>>['formState']['errors'];
	contactSubmitCount: number;
	submitContactForm: (e?: React.BaseSyntheticEvent) => Promise<void>;
	submitLandingLeadMutation: ReturnType<typeof useMutation<{ accepted: boolean; message: string }, Error, CreateLandingLeadInput>>;
	contactSubmissionState: LandingContactSubmissionState;
	contactSubmissionMessage: string;
	contactSubjectOptions: ContactSubjectOptions;
	showContactFormError: boolean;
	contactFeedbackCopy: LandingContactFeedbackCopy;
	defaultFormValues: LandingContactFormValues;
};

export function useLandingContactSubmit(): UseLandingContactSubmitReturn {
	const { t } = useAppTranslation();
	const { notify } = useFeedback();
	const currentLocale = resolveLandingLocale(appI18n.resolvedLanguage);

	const contactSubjectOptions = t('landing.contact.form.subjectOptions', {
		returnObjects: true
	}) as ContactSubjectOptions;
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

	return {
		control,
		register,
		contactFormErrors,
		contactSubmitCount,
		submitContactForm,
		submitLandingLeadMutation,
		contactSubmissionState,
		contactSubmissionMessage,
		contactSubjectOptions,
		showContactFormError,
		contactFeedbackCopy,
		defaultFormValues
	};
}
