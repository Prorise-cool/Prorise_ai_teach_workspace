import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { scrollToLandingSection } from '@/features/home/shared/landing-utils';

export type LandingPlan = {
	title: string;
	description: string;
	price: string;
	period: string;
	button: string;
	popular: boolean;
	benefits: string[];
};

export function LandingPricing() {
	const { t } = useAppTranslation();
	const planItems = t('landing.pricing.plans', {
		returnObjects: true
	}) as LandingPlan[];

	return (
		<section id="pricing" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto max-w-[1440px]">
				<div className="text-center">
					<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
						{t('landing.pricing.eyebrow')}
					</h2>
					<h3 className="mb-4 text-4xl font-bold">{t('landing.pricing.title')}</h3>
					<p className="mx-auto max-w-3xl text-xl text-muted-foreground">
						{t('landing.pricing.description')}
					</p>
				</div>

				<div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
					{planItems.map(plan => (
						<article
							key={plan.title}
							className={cn(
								'rounded-[var(--xm-radius-lg)] border p-6',
								plan.popular
									? 'drop-shadow-xl shadow-black/10 dark:shadow-white/10 border-[1.5px] border-primary lg:scale-[1.04]'
									: 'border-border bg-card'
							)}
						>
							<h4 className="pb-2 text-2xl font-semibold">{plan.title}</h4>
							<p className="pb-4 text-sm text-muted-foreground">{plan.description}</p>
							<div>
								<span className="text-3xl font-bold">¥{plan.price}</span>
								<span className="text-muted-foreground">{plan.period}</span>
							</div>

							<div className="mt-8 space-y-4">
								{plan.benefits.map(benefit => (
									<span key={benefit} className="flex items-center text-sm">
										<Check className="mr-2 h-4 w-4 text-primary" />
										{benefit}
									</span>
								))}
							</div>

							<a
								href="#contact"
								className={cn(
									'mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition',
									plan.popular
										? 'bg-primary text-primary-foreground hover:brightness-105'
										: 'border border-border bg-secondary text-secondary-foreground hover:bg-accent'
								)}
								onClick={event => {
									event.preventDefault();
									scrollToLandingSection('#contact');
								}}
							>
								{plan.button}
							</a>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
