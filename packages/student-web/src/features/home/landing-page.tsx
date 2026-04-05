/**
 * 文件说明：公开营销落地页。
 * 负责展示品牌价值、试点方案与联系入口，不承担鉴权逻辑。
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { LandingBenefits } from '@/features/home/components/landing-benefits';
import { LandingCommunity } from '@/features/home/components/landing-community';
import { LandingContact } from '@/features/home/components/landing-contact';
import { LandingFaq } from '@/features/home/components/landing-faq';
import { LandingFeatures } from '@/features/home/components/landing-features';
import { LandingFooter } from '@/features/home/components/landing-footer';
import { LandingHero } from '@/features/home/components/landing-hero';
import { LandingHowItWorks } from '@/features/home/components/landing-how-it-works';
import { LandingPricing } from '@/features/home/components/landing-pricing';
import { LandingServices } from '@/features/home/components/landing-services';
import { LandingSponsors } from '@/features/home/components/landing-sponsors';
import { LandingTestimonials } from '@/features/home/components/landing-testimonials';
import { LandingTopNav } from '@/features/home/components/landing-top-nav';
import { scrollToLandingSection } from '@/features/home/shared/landing-utils';

import '@/features/home/styles/entry-pages.scss';

/**
 * 渲染公开落地页。
 *
 * @returns 落地页节点。
 */
export function LandingPage() {
	const location = useLocation();

	useEffect(() => {
		if (!location.hash) {
			return;
		}

		const timer = window.setTimeout(() => {
			scrollToLandingSection(location.hash, false);
		}, 60);

		return () => {
			window.clearTimeout(timer);
		};
	}, [location.hash]);

	return (
		<main className="xm-landing-page pb-16">
			<LandingTopNav />
			<LandingHero />
			<LandingSponsors />
			<LandingBenefits />
			<LandingFeatures />
			<LandingServices />
			<LandingHowItWorks />
			<LandingTestimonials />
			<LandingCommunity />
			<LandingPricing />
			<LandingContact />
			<LandingFaq />
			<LandingFooter />
		</main>
	);
}
