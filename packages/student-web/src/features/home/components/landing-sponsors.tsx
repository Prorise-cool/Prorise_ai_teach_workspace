import { useMemo } from 'react';
import { Crown, Vegan, Ghost, Puzzle, Squirrel, Cookie, Drama } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type LandingSponsorIconKey =
	| 'crown'
	| 'vegan'
	| 'ghost'
	| 'puzzle'
	| 'squirrel'
	| 'cookie'
	| 'drama';

export type LandingSponsor = {
	label: string;
	icon: LandingSponsorIconKey;
};

/**
 * 根据配置返回 sponsor 图标组件。
 *
 * @param icon - sponsor 图标标识。
 * @returns lucide 图标组件。
 */
function resolveSponsorIcon(icon: LandingSponsorIconKey) {
	const iconMap = {
		crown: Crown,
		vegan: Vegan,
		ghost: Ghost,
		puzzle: Puzzle,
		squirrel: Squirrel,
		cookie: Cookie,
		drama: Drama
	} satisfies Record<LandingSponsorIconKey, typeof Crown>;

	return iconMap[icon];
}

export function LandingSponsors() {
	const { t } = useAppTranslation();
	const sponsorItems = t('landing.sponsors.items', {
		returnObjects: true
	}) as LandingSponsor[];

	const duplicateSponsors = useMemo(
		() => [...sponsorItems, ...sponsorItems],
		[sponsorItems]
	);

	return (
		<section id="sponsors" className="mx-auto max-w-[82%] px-5 pb-24 md:px-8 sm:pb-32">
			<h2 className="mb-6 text-center text-lg">{t('landing.sponsors.title')}</h2>

			<div className="xm-landing-marquee">
				<div className="xm-landing-marquee-track">
					{duplicateSponsors.map((item, index) => {
						const Icon = resolveSponsorIcon(item.icon);

						return (
							<div
								key={`${item.label}-${index}`}
								className="xm-landing-sponsor-chip px-2 py-3 text-xl font-medium md:text-2xl"
							>
								<Icon className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" />
								<span>{item.label}</span>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
