/**
 * 文件说明：公开营销落地页联系表单。
 * 负责表单校验、匿名线索提交、提交反馈与成功后的重置策略。
 */
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { useLandingContactSubmit } from '@/features/home/hooks/use-landing-contact-submit';
import { ContactInfoPanel, ContactForm } from './contact-info-panel';

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

/**
 * 渲染落地页联系区块，并接入真实线索提交链路。
 *
 * @returns 落地页联系区块节点。
 */
export function LandingContact() {
	const { t } = useAppTranslation();
	const {
		register,
		contactFormErrors,
		submitContactForm,
		submitLandingLeadMutation,
		contactSubmissionState,
		contactSubmissionMessage,
		contactSubjectOptions,
		showContactFormError,
		contactFeedbackCopy
	} = useLandingContactSubmit();

	const contactInfo = t('landing.contact.info', { returnObjects: true }) as ContactInfo;

	return (
		<section id="contact" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-2">
				<ContactInfoPanel contactInfo={contactInfo} t={t} />

				<div className="rounded-[var(--xm-radius-lg)] border border-border bg-muted/60 p-6">
					<ContactForm
						register={register}
						contactFormErrors={contactFormErrors}
						submitContactForm={submitContactForm}
						submitLandingLeadMutation={submitLandingLeadMutation}
						contactSubjectOptions={contactSubjectOptions}
						showContactFormError={showContactFormError}
						contactSubmissionState={contactSubmissionState}
						contactSubmissionMessage={contactSubmissionMessage}
						contactFeedbackCopy={contactFeedbackCopy}
						t={t}
					/>
				</div>
			</div>
		</section>
	);
}
