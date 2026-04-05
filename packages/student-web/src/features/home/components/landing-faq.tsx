import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { scrollToLandingSection } from '@/features/home/shared/landing-utils';

export type LandingFaq = {
	question: string;
	answer: string;
};

export function LandingFaq() {
	const { t } = useAppTranslation();
	const faqItems = t('landing.faq.items', {
		returnObjects: true
	}) as LandingFaq[];

	const [activeFaqIndex, setActiveFaqIndex] = useState(0);

	return (
		<section id="faq" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto max-w-[700px]">
				<div className="mb-8 text-center">
					<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
						{t('landing.faq.eyebrow')}
					</h2>
					<h3 className="text-4xl font-bold">{t('landing.faq.title')}</h3>
				</div>

				<div>
					{faqItems.map((item, index) => {
						const isOpen = activeFaqIndex === index;

						return (
							<div key={item.question} className="border-b border-border">
								<button
									type="button"
									className="flex w-full items-center justify-between py-4 text-left text-base font-medium"
									aria-expanded={isOpen}
									onClick={() => {
										setActiveFaqIndex(currentIndex =>
											currentIndex === index ? -1 : index
										);
									}}
								>
									<span>{item.question}</span>
									<ChevronDown
										className={cn(
											'h-4 w-4 shrink-0 transition-transform',
											isOpen ? 'rotate-180' : null
										)}
									/>
								</button>

								<div
									className="xm-landing-accordion-content"
									style={{
										maxHeight: isOpen ? '320px' : '0px'
									}}
								>
									<div className="pb-4 text-sm leading-7 text-muted-foreground">
										{item.answer}
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<h4 className="mt-4 font-medium">
					<span>{t('landing.faq.stillHaveQuestions')}</span>
					<a
						href="#contact"
						className="ml-2 underline text-muted-foreground"
						onClick={event => {
							event.preventDefault();
							scrollToLandingSection('#contact');
						}}
					>
						{t('landing.faq.contactUs')}
					</a>
				</h4>
			</div>
		</section>
	);
}
