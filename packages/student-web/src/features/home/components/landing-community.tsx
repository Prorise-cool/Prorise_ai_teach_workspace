import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { scrollToLandingSection } from '@/features/home/shared/landing-utils';

/**
 * 渲染社区区域使用的 Discord 图标。
 *
 * @returns Discord SVG 图标节点。
 */
function LandingDiscordIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M14.983 3l.123.006c2.014.214 3.527.672 4.966 1.673a1 1 0 0 1 .371.488c1.876 5.315 2.373 9.987 1.451 12.28C20.891 19.452 19.288 21 17.5 21c-.732 0-1.693-.968-2.328-2.045a21.512 21.512 0 0 0 2.103-.493 1 1 0 1 0-.55-1.924c-3.32.95-6.13.95-9.45 0a1 1 0 0 0-.55 1.924c.717.204 1.416.37 2.103.494C8.193 20.031 7.232 21 6.5 21c-1.788 0-3.391-1.548-4.428-3.629C1.184 15.154 1.682 10.481 3.557 5.167a1 1 0 0 1 .371-.488C5.367 3.678 6.88 3.22 8.894 3.006a1 1 0 0 1 .935.435l.063.107.651 1.285.137-.016a12.97 12.97 0 0 1 2.643 0l.134.016.65-1.284a1 1 0 0 1 .754-.54L14.983 3Zm-5.983 7a2 2 0 0 0-1.977 1.697L7.005 11.846 7 11.995l.005.15a2 2 0 1 0 1.995-2.15Zm6 0a2 2 0 0 0-1.977 1.697l-.018.154-.005.149.005.15a2 2 0 1 0 1.995-2.15Z" />
		</svg>
	);
}

export function LandingCommunity() {
	const { t } = useAppTranslation();

	return (
		<section id="community" className="py-12">
			<div className="mx-auto max-w-[1440px] px-5 md:px-8">
				<div className="border-y border-border py-20">
					<div className="mx-auto max-w-[900px] text-center">
						<h2 className="text-4xl font-bold md:text-5xl">
							<span className="xm-landing-community-icon mx-auto">
								<LandingDiscordIcon />
							</span>
							<span>{t('landing.community.titleLead')}</span>
							<span className="xm-landing-hero-gradient bg-clip-text text-transparent">
								{t('landing.community.titleAccent')}
							</span>
						</h2>
						<p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground">
							{t('landing.community.description')}
						</p>
						<a
							href="#contact"
							className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-105"
							onClick={event => {
								event.preventDefault();
								scrollToLandingSection('#contact');
							}}
						>
							{t('landing.community.action')}
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
