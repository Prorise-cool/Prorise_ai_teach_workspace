import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveCarouselFallbackSnapCount } from '@/features/home/shared/landing-utils';

export type LandingReview = {
	name: string;
	role: string;
	comment: string;
};

type LandingTestimonialsCarouselProps = {
	reviews: LandingReview[];
	previousLabel: string;
	nextLabel: string;
};

/**
 * 渲染 testimonial 轮播区。
 *
 * @param props - 轮播数据与按钮文案。
 * @returns 轮播节点。
 */
function LandingTestimonialsCarousel({
	reviews,
	previousLabel,
	nextLabel
}: LandingTestimonialsCarouselProps) {
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: 'start',
		containScroll: 'trimSnaps'
	});
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [snapCount, setSnapCount] = useState(() =>
		resolveCarouselFallbackSnapCount(reviews.length)
	);

	useEffect(() => {
		if (!emblaApi) {
			return;
		}

		const carouselApi = emblaApi;

		function syncCarouselState() {
			setSelectedIndex(carouselApi.selectedScrollSnap());
			setSnapCount(
				Math.max(
					carouselApi.scrollSnapList().length,
					resolveCarouselFallbackSnapCount(reviews.length)
				)
			);
		}

		syncCarouselState();
		carouselApi.on('select', syncCarouselState);
		carouselApi.on('reInit', syncCarouselState);

		return () => {
			carouselApi.off('select', syncCarouselState);
			carouselApi.off('reInit', syncCarouselState);
		};
	}, [emblaApi, reviews.length]);

	const canScrollPrev = selectedIndex > 0;
	const canScrollNext = selectedIndex < snapCount - 1;

	return (
		<div className="relative mx-auto w-[88%] sm:w-[90%] lg:max-w-screen-xl">
			<div className="xm-landing-carousel-viewport" ref={emblaRef}>
				<div className="xm-landing-carousel-track" data-testid="landing-carousel-track">
					{reviews.map(review => (
						<div
							key={`${review.name}-${review.role}`}
							className="xm-landing-carousel-slide"
						>
							<article className="h-full rounded-[var(--xm-radius-lg)] border border-border bg-muted/50 dark:bg-card">
								<div className="px-6 pb-0 pt-6">
									<div className="flex gap-1 pb-6 text-primary">
										{Array.from({ length: 5 }).map((_, index) => (
											<Star
												key={`${review.name}-${index}`}
												className="h-4 w-4 fill-current"
											/>
										))}
									</div>

									<p className="text-base leading-7 text-foreground">
										“{review.comment}”
									</p>
								</div>

								<div className="px-6 pb-6 pt-8">
									<div className="flex items-center gap-4">
										<span className="xm-landing-avatar-shell">
											<img
												src="/entry/avatar-shadcn.png"
												alt=""
												aria-hidden="true"
												className="h-full w-full object-cover"
											/>
										</span>

										<div className="flex flex-col">
											<h3 className="text-lg font-semibold">{review.name}</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												{review.role}
											</p>
										</div>
									</div>
								</div>
							</article>
						</div>
					))}
				</div>
			</div>

			<button
				type="button"
				className="xm-landing-carousel-btn xm-landing-carousel-btn--prev"
				aria-label={previousLabel}
				disabled={!canScrollPrev}
				onClick={() => {
					if (emblaApi) {
						emblaApi.scrollPrev();
					}

					setSelectedIndex(currentIndex => Math.max(currentIndex - 1, 0));
				}}
			>
				<ChevronLeft className="h-4 w-4" />
			</button>
			<button
				type="button"
				className="xm-landing-carousel-btn xm-landing-carousel-btn--next"
				aria-label={nextLabel}
				disabled={!canScrollNext}
				onClick={() => {
					if (emblaApi) {
						emblaApi.scrollNext();
					}

					setSelectedIndex(currentIndex =>
						Math.min(currentIndex + 1, snapCount - 1)
					);
				}}
			>
				<ChevronRight className="h-4 w-4" />
			</button>
		</div>
	);
}

export function LandingTestimonials() {
	const { t } = useAppTranslation();
	const reviewItems = t('landing.testimonials.reviews', {
		returnObjects: true
	}) as LandingReview[];

	return (
		<section id="testimonials" className="px-5 py-24 md:px-8 sm:py-32">
			<div className="mx-auto max-w-[1440px]">
				<div className="mb-8 text-center">
					<h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
						{t('landing.testimonials.eyebrow')}
					</h2>
					<h3 className="mb-4 text-4xl font-bold">
						{t('landing.testimonials.title')}
					</h3>
				</div>

				<LandingTestimonialsCarousel
					reviews={reviewItems}
					previousLabel={t('common.previous')}
					nextLabel={t('common.next')}
				/>
			</div>
		</section>
	);
}
