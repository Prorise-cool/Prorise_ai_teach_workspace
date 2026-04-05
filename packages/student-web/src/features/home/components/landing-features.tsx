import { TabletSmartphone, Sparkles, MousePointerClick, PictureInPicture2, Newspaper, Goal } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export type LandingFeature = {
	title: string;
	description: string;
};

export function LandingFeatures() {
	const { t } = useAppTranslation();
	const featureItems = t('landing.features.items', {
		returnObjects: true
	}) as LandingFeature[];

	const featureIcons = [
		TabletSmartphone,
		Sparkles,
		MousePointerClick,
		PictureInPicture2,
		Newspaper,
		Goal
	];

	return (
		<section id="features" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto max-w-[1440px]">
				<div className="text-center">
					<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
						{t('landing.features.eyebrow')}
					</h2>
					<h3 className="mb-4 text-4xl font-bold">
						{t('landing.features.title')}
					</h3>
					<p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
						{t('landing.features.description')}
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{featureItems.map((item, index) => {
						const Icon = featureIcons[index];

						return (
							<article
								key={item.title}
								className="rounded-[var(--xm-radius-lg)] p-6 text-center"
							>
								<div className="xm-landing-style-ring mx-auto mb-4 inline-flex rounded-full p-3">
									<Icon className="h-6 w-6 text-primary" />
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
