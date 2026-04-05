import { Blocks, Goal, Wallet, Sparkles } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export type LandingBenefit = {
	title: string;
	description: string;
};

export function LandingBenefits() {
	const { t } = useAppTranslation();
	const benefitItems = t('landing.benefits.items', {
		returnObjects: true
	}) as LandingBenefit[];

	const benefitIcons = [Blocks, Goal, Wallet, Sparkles];

	return (
		<section id="benefits" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
				<div>
					<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
						{t('landing.benefits.eyebrow')}
					</h2>
					<h3 className="mb-4 text-4xl font-bold">
						{t('landing.benefits.title')}
					</h3>
					<p className="text-xl text-muted-foreground">
						{t('landing.benefits.description')}
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					{benefitItems.map((item, index) => {
						const Icon = benefitIcons[index];

						return (
							<article
								key={item.title}
								className="xm-landing-benefit-card rounded-[var(--xm-radius-lg)] border border-border bg-muted/50 p-6 hover:bg-background"
							>
								<div className="mb-6 flex items-start justify-between">
									<Icon className="h-8 w-8 text-primary" />
									<span className="xm-landing-benefit-card__index text-5xl font-medium">
										{String(index + 1).padStart(2, '0')}
									</span>
								</div>
								<h4 className="text-2xl font-semibold">{item.title}</h4>
								<p className="mt-4 leading-7 text-muted-foreground">
									{item.description}
								</p>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
