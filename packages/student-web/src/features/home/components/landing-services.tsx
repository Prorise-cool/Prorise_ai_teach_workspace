import { useAppTranslation } from '@/app/i18n/use-app-translation';

export type LandingService = {
	title: string;
	description: string;
	pro: boolean;
};

export function LandingServices() {
	const { t } = useAppTranslation();
	const serviceItems = t('landing.services.items', {
		returnObjects: true
	}) as LandingService[];

	return (
		<section id="services" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto max-w-[1440px] text-center">
				<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
					{t('landing.services.eyebrow')}
				</h2>
				<h3 className="mb-4 text-4xl font-bold">
					{t('landing.services.title')}
				</h3>
				<p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
					{t('landing.services.description')}
				</p>

				<div className="mx-auto grid max-w-[860px] gap-4 md:grid-cols-2">
					{serviceItems.map(item => (
						<article
							key={item.title}
							className="relative rounded-[var(--xm-radius-lg)] border border-border bg-muted/60 p-6 text-left"
						>
							<h4 className="text-2xl font-semibold">{item.title}</h4>
							<p className="mt-3 text-sm leading-6 text-muted-foreground">
								{item.description}
							</p>

							{item.pro ? (
								<span className="absolute -right-3 -top-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
									PRO
								</span>
							) : null}
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
