/**
 * 文件说明：落地页联系表单的表单字段子组件。
 * 包含姓名、邮箱、主题、消息等表单字段。
 */
import type { UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LandingContactFormValues } from '@/features/home/schemas/landing-contact-form-schema';

type FormFieldErrors = Partial<Record<keyof LandingContactFormValues, { message?: string }>>;

export function ContactNameFields({
	register,
	errors,
	disabled,
	t
}: {
	register: UseFormRegister<LandingContactFormValues>;
	errors: FormFieldErrors;
	disabled: boolean;
	t: (key: string) => string;
}) {
	return (
		<div className="flex flex-col gap-4 md:flex-row">
			<div className="flex w-full flex-col gap-1.5">
				<Label className="text-sm font-medium" htmlFor="contact-first-name">
					{t('landing.contact.form.firstName')}
				</Label>
				<Input
					id="contact-first-name"
					placeholder={t('landing.contact.form.firstNamePlaceholder')}
					aria-invalid={Boolean(errors.firstName)}
					disabled={disabled}
					{...register('firstName')}
				/>
				{errors.firstName?.message ? (
					<p className="text-sm text-destructive">{errors.firstName.message}</p>
				) : null}
			</div>

			<div className="flex w-full flex-col gap-1.5">
				<Label className="text-sm font-medium" htmlFor="contact-last-name">
					{t('landing.contact.form.lastName')}
				</Label>
				<Input
					id="contact-last-name"
					placeholder={t('landing.contact.form.lastNamePlaceholder')}
					disabled={disabled}
					{...register('lastName')}
				/>
			</div>
		</div>
	);
}

export function ContactEmailField({
	register,
	errors,
	disabled,
	t
}: {
	register: UseFormRegister<LandingContactFormValues>;
	errors: FormFieldErrors;
	disabled: boolean;
	t: (key: string) => string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-sm font-medium" htmlFor="contact-email">
				{t('landing.contact.form.email')}
			</Label>
			<Input
				id="contact-email"
				type="email"
				placeholder={t('landing.contact.form.emailPlaceholder')}
				aria-invalid={Boolean(errors.email)}
				disabled={disabled}
				{...register('email')}
			/>
			{errors.email?.message ? (
				<p className="text-sm text-destructive">{errors.email.message}</p>
			) : null}
		</div>
	);
}

export function ContactSubjectField({
	register,
	errors,
	disabled,
	options,
	t
}: {
	register: UseFormRegister<LandingContactFormValues>;
	errors: FormFieldErrors;
	disabled: boolean;
	options: string[];
	t: (key: string) => string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-sm font-medium" htmlFor="contact-subject">
				{t('landing.contact.form.subject')}
			</Label>
			<select
				id="contact-subject"
				className="xm-landing-field"
				aria-invalid={Boolean(errors.subject)}
				disabled={disabled}
				{...register('subject')}
			>
				{options.map(option => (
					<option key={option} value={option}>{option}</option>
				))}
			</select>
			{errors.subject?.message ? (
				<p className="text-sm text-destructive">{errors.subject.message}</p>
			) : null}
		</div>
	);
}

export function ContactMessageField({
	register,
	errors,
	disabled,
	t
}: {
	register: UseFormRegister<LandingContactFormValues>;
	errors: FormFieldErrors;
	disabled: boolean;
	t: (key: string) => string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-sm font-medium" htmlFor="contact-message">
				{t('landing.contact.form.message')}
			</Label>
			<Textarea
				id="contact-message"
				rows={5}
				className="min-h-[120px] resize-y"
				placeholder={t('landing.contact.form.messagePlaceholder')}
				aria-invalid={Boolean(errors.message)}
				disabled={disabled}
				{...register('message')}
			/>
			{errors.message?.message ? (
				<p className="text-sm text-destructive">{errors.message.message}</p>
			) : null}
		</div>
	);
}
