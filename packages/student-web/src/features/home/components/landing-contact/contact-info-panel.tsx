/**
 * 文件说明：落地页联系信息面板与联系表单子组件。
 * 从 index.tsx 中提取，减少主文件体积。
 */
import { Button } from '@/components/ui/button';
import { Goal, Phone, Mail, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LandingContactFormValues } from '@/features/home/schemas/landing-contact-form-schema';
import type { UseFormRegister } from 'react-hook-form';
import {
	ContactNameFields,
	ContactEmailField,
	ContactSubjectField,
	ContactMessageField
} from './contact-form-fields';

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

export function ContactInfoPanel({
	contactInfo,
	t
}: {
	contactInfo: ContactInfo;
	t: (key: string) => string;
}) {
	return (
		<div>
			<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
				{t('landing.contact.eyebrow')}
			</h2>
			<h3 className="text-4xl font-bold">{t('landing.contact.title')}</h3>
			<p className="mb-8 mt-4 max-w-xl text-muted-foreground">
				{t('landing.contact.description')}
			</p>

			<div className="flex flex-col gap-5">
				<ContactInfoItem icon={<Goal className="h-5 w-5" />} title={contactInfo.locationTitle}>
					<div>{contactInfo.locationValue}</div>
				</ContactInfoItem>
				<ContactInfoItem icon={<Phone className="h-5 w-5" />} title={contactInfo.phoneTitle}>
					<div>{contactInfo.phoneValue}</div>
				</ContactInfoItem>
				<ContactInfoItem icon={<Mail className="h-5 w-5" />} title={contactInfo.mailTitle}>
					<div>{contactInfo.mailValue}</div>
				</ContactInfoItem>
				<ContactInfoItem icon={<Clock3 className="h-5 w-5" />} title={contactInfo.visitTitle}>
					<div>{contactInfo.visitValue1}</div>
					<div>{contactInfo.visitValue2}</div>
				</ContactInfoItem>
			</div>
		</div>
	);
}

function ContactInfoItem({ icon, title, children }: {
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="mb-1 flex items-center gap-2 font-bold">
				{icon}
				{title}
			</div>
			{children}
		</div>
	);
}

type FormFieldErrors = Partial<Record<keyof LandingContactFormValues, { message?: string }>>;

type ContactFormProps = {
	register: UseFormRegister<LandingContactFormValues>;
	contactFormErrors: FormFieldErrors;
	submitContactForm: (e?: React.BaseSyntheticEvent) => Promise<void>;
	submitLandingLeadMutation: { isPending: boolean };
	contactSubjectOptions: string[];
	showContactFormError: boolean;
	contactSubmissionState: 'idle' | 'success' | 'error';
	contactSubmissionMessage: string;
	contactFeedbackCopy: {
		submittingLabel: string;
		successTitle: string;
		successDescription: string;
		errorTitle: string;
		errorDescription: string;
	};
	t: (key: string) => string;
};

export function ContactForm({
	register,
	contactFormErrors,
	submitContactForm,
	submitLandingLeadMutation,
	contactSubjectOptions,
	showContactFormError,
	contactSubmissionState,
	contactSubmissionMessage,
	contactFeedbackCopy,
	t
}: ContactFormProps) {
	return (
		<form
			className="grid gap-4"
			aria-busy={submitLandingLeadMutation.isPending}
			noValidate
			onSubmit={event => { void submitContactForm(event); }}
		>
			<ContactNameFields register={register} errors={contactFormErrors} disabled={submitLandingLeadMutation.isPending} t={t} />
			<ContactEmailField register={register} errors={contactFormErrors} disabled={submitLandingLeadMutation.isPending} t={t} />
			<ContactSubjectField register={register} errors={contactFormErrors} disabled={submitLandingLeadMutation.isPending} options={contactSubjectOptions} t={t} />
			<ContactMessageField register={register} errors={contactFormErrors} disabled={submitLandingLeadMutation.isPending} t={t} />

			{showContactFormError ? (
				<div className="xm-landing-contact-alert rounded-[var(--xm-radius-lg)] border border-destructive/40 px-4 py-3">
					<div className="font-semibold text-destructive">{t('landing.contact.form.errorTitle')}</div>
					<div className="mt-1 text-sm text-muted-foreground">{t('landing.contact.form.errorDescription')}</div>
				</div>
			) : null}

			{contactSubmissionState !== 'idle' ? (
				<div
					role={contactSubmissionState === 'success' ? 'status' : 'alert'}
					className={cn(
						'xm-landing-contact-alert rounded-[var(--xm-radius-lg)] px-4 py-3',
						contactSubmissionState === 'success' ? 'border border-primary/40 bg-primary/5' : 'border border-destructive/40'
					)}
				>
					<div className={cn('font-semibold', contactSubmissionState === 'success' ? 'text-primary' : 'text-destructive')}>
						{contactSubmissionState === 'success' ? contactFeedbackCopy.successTitle : contactFeedbackCopy.errorTitle}
					</div>
					<div className="mt-1 text-sm text-muted-foreground">{contactSubmissionMessage}</div>
				</div>
			) : null}

			<Button type="submit" size="lg" className="mt-4" disabled={submitLandingLeadMutation.isPending}>
				{submitLandingLeadMutation.isPending ? contactFeedbackCopy.submittingLabel : t('landing.contact.form.button')}
			</Button>
		</form>
	);
}
