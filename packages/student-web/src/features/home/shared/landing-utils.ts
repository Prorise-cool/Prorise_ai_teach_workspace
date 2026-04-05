/**
 * 文件说明：公开首页 / 落地页共享交互工具。
 * 负责语言归一化、轮播兜底计算与锚点滚动等无状态工具能力。
 */

export type LandingLocale = 'zh-CN' | 'en-US';

/**
 * 归一化当前落地页语言，保证只透传产品支持的两种 locale。
 *
 * @param locale - i18n 当前语言。
 * @returns 标准化后的落地页语言。
 */
export function resolveLandingLocale(locale?: string): LandingLocale {
	return locale === 'en-US' ? 'en-US' : 'zh-CN';
}

/**
 * 根据当前视口宽度推导轮播每屏卡片数。
 *
 * @param viewportWidth - 当前窗口宽度。
 * @returns 每屏卡片数量。
 */
export function resolveSlidesPerView(viewportWidth: number) {
	if (viewportWidth >= 1024) {
		return 3;
	}

	if (viewportWidth >= 768) {
		return 2;
	}

	return 1;
}

/**
 * 在轮播实例未就绪时，基于卡片总数和视口宽度推导兜底 snap 数量。
 *
 * @param reviewCount - 当前评论卡片数量。
 * @returns 兜底的 snap 数量。
 */
export function resolveCarouselFallbackSnapCount(reviewCount: number) {
	const viewportWidth =
		typeof window === 'undefined' ? 1280 : window.innerWidth;

	return Math.max(
		reviewCount - resolveSlidesPerView(viewportWidth) + 1,
		1
	);
}

/**
 * 平滑滚动到落地页指定区块，并按需同步 hash。
 *
 * @param href - 目标锚点。
 * @param updateHash - 是否更新地址栏 hash。
 */
export function scrollToLandingSection(href: string, updateHash = true) {
	const hashValue = href.includes('#') ? `#${href.split('#')[1] ?? ''}` : href;
	const sectionId = hashValue.replace(/^#/, '');

	if (!sectionId) {
		return;
	}

	const targetSection = document.getElementById(sectionId);

	if (!targetSection) {
		return;
	}

	if (updateHash) {
		const nextUrl = `${window.location.pathname}${window.location.search}#${sectionId}`;
		window.history.replaceState(window.history.state, '', nextUrl);
	}

	if (typeof targetSection.scrollIntoView === 'function') {
		targetSection.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});
		return;
	}

	if (
		typeof window.scrollTo === 'function' &&
		!window.navigator.userAgent.toLowerCase().includes('jsdom')
	) {
		window.scrollTo({
			top: targetSection.getBoundingClientRect().top + window.scrollY,
			behavior: 'smooth'
		});
	}
}
