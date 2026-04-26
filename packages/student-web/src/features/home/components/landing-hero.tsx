import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

export function LandingHero() {
	const { t } = useAppTranslation();
	const { themeMode } = useThemeMode();

	return (
		<section id="hero" className="px-5 pt-12 md:px-8 md:pt-16">
			<div className="mx-auto grid max-w-[1440px] place-items-center gap-8 py-12 md:py-20">
				<div className="max-w-[960px] space-y-8 text-center">
					<div className="xm-landing-glass-surface inline-flex items-center rounded-full px-4 py-2 text-sm">
						<span className="mr-2 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
							{t('landing.hero.badgeLead')}
						</span>
						<span>{t('landing.hero.badgeText')}</span>
					</div>

					<div className="mx-auto max-w-screen-lg text-center text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
						<h1>
							<span>{t('landing.hero.titlePrefix')}</span>
							<span className="xm-landing-hero-gradient bg-clip-text text-transparent">
								{t('landing.hero.titleAccent')}
							</span>
							<span>{t('landing.hero.titleSuffix')}</span>
						</h1>
					</div>

					<p className="mx-auto max-w-screen-md text-lg leading-relaxed text-muted-foreground md:text-xl">
						{t('landing.hero.description')}
					</p>

					<div className="space-y-4 md:space-y-0">
						<Link
							to="/"
							className="group/arrow inline-flex min-w-[220px] items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-105"
						>
							<span>{t('landing.hero.primaryAction')}</span>
							<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/arrow:translate-x-1" />
						</Link>
					</div>
				</div>

				<div className="xm-landing-hero-shell relative mt-10 w-full max-w-[1200px]">
					<img
						src={
							themeMode === 'dark'
								? 'https://bu.dusays.com/2026/04/26/69edb518ac673.png'
								: 'https://bu.dusays.com/2026/04/26/69edb504f119c.png'
						}
						alt={t('landing.hero.imageAlt')}
						className="xm-landing-hero-image w-full rounded-[var(--xm-radius-xl)] border border-t-2 border-[color:var(--xm-color-primary)] object-cover"
					/>

					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-[var(--xm-radius-xl)] bg-gradient-to-b from-background/0 via-background/50 to-background md:h-32" />
				</div>
			</div>
		</section>
	);
}
