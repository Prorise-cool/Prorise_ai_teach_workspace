import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

export type LandingStep = {
	badge: string;
	title: string;
	description: string;
	imageSrc: string;
	imageAlt: string;
};

export function LandingHowItWorks() {
	const { t } = useAppTranslation();
	const stepItems = t('landing.howItWorks.items', {
		returnObjects: true
	}) as LandingStep[];

	return (
		<section id="how-it-works" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto max-w-[1440px]">
				<div className="mb-8 text-center">
					<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
						{t('landing.howItWorks.eyebrow')}
					</h2>
					<h3 className="text-4xl font-bold">{t('landing.howItWorks.title')}</h3>
				</div>

				<div className="mx-auto max-w-[1280px]">
					{stepItems.map((item, index) => (
						<div
							key={item.title}
							className={cn(
								'mb-16 flex items-center gap-10',
								index % 2 === 1
									? 'flex-col-reverse lg:flex-row-reverse'
									: 'flex-col lg:flex-row'
							)}
						>
							<div className="flex-1 rounded-[var(--xm-radius-lg)] bg-transparent p-4">
								<span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
									{item.badge}
								</span>
								<h4 className="mt-4 text-3xl font-semibold">{item.title}</h4>
								<p className="mt-4 max-w-xl leading-7 text-muted-foreground">
									{item.description}
								</p>
							</div>

							<div className="relative flex flex-1 items-center justify-center">
								<div className="absolute h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
								<img
									src={item.imageSrc}
									alt={item.imageAlt}
									className="relative mx-auto w-full max-w-[560px] rounded-[var(--xm-radius-lg)] object-contain shadow-lg ring-1 ring-border/40 md:max-w-[640px] lg:max-w-[720px]"
								/>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
