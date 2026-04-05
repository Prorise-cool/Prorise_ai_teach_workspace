/**
 * 文件说明：Story 1.4 的公开首页入口页。
 * 负责承接课堂主入口、跳转到独立落地页，并保持首页默认不鉴权。
 */
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { Button } from '@/components/ui/button';

import '@/features/home/styles/entry-pages.scss';

type EntryNavLink = {
	href: string;
	label: string;
};

/**
 * 渲染公开首页，默认把用户带向课堂工作区主入口。
 *
 * @returns 首页节点。
 */
export function HomePage() {
	const { t } = useAppTranslation();
	const navLinks = t('entryNav.links', {
		returnObjects: true
	}) as EntryNavLink[];

	return (
		<main className="xm-entry-home">
			<div className="xm-entry-home__glow" />

			<div className="xm-entry-home__content">
				<GlobalTopNav
					links={navLinks}
					variant="home"
					showLocaleToggle
					className="xm-entry-home__nav"
				/>

				<section className="xm-entry-home__hero">
					<div className="xm-entry-home__anim-left">
						<h1 className="xm-entry-home__title">
							{t('entryHome.titleLine1')}
						</h1>
						<h1 className="xm-entry-home__title">
							{t('entryHome.titleLine2')}
							<br />
							{t('entryHome.titleLine3')}
						</h1>
					</div>

					<div className="xm-entry-home__anim-right">
						<div className="xm-entry-home__subtitle">
							<span>{t('entryHome.eyebrowLine1')}</span>
							<span className="text-primary">{t('entryHome.eyebrowAccent')}</span>
							<span>{t('entryHome.eyebrowLine3')}</span>
						</div>

						<p className="xm-entry-home__description">
							{t('entryHome.description')}
						</p>

						<div className="flex flex-wrap items-center gap-3">
							<Button asChild size="hero">
								<Link to="/classroom/input">
									{t('entryHome.primaryAction')}
								</Link>
							</Button>
						</div>
					</div>
				</section>
			</div>

			<img
				src="/entry/role.png"
				alt={t('entryHome.imageAlt')}
				className="xm-entry-home__role"
			/>

			<div className="xm-entry-home__wave-shell">
				<svg
					className="xm-entry-home__wave-bg"
					preserveAspectRatio="none"
					viewBox="0 0 1440 327"
				>
					<path
						d="M-10.5-39.7c409.4 253.7 1010.8 253.7 1459.4 12.9l-8.9 353.8-1440 0z"
						fill="var(--xm-color-primary)"
					/>
				</svg>

				<div className="xm-entry-home__wave-cta">
					<span className="xm-entry-home__wave-label hidden text-right md:block">
						{t('entryHome.workspaceHint')}
					</span>

					<Link
						to="/classroom/input"
						className="xm-entry-home__wave-button"
						aria-label={t('entryNav.openWorkspace')}
					>
						<span className="xm-entry-home__wave-button-inner" aria-hidden="true">
							<Play className="xm-entry-home__wave-icon" />
						</span>
					</Link>

					<span className="xm-entry-home__wave-label hidden md:block">
						{t('entryHome.workspaceHint')}
					</span>
				</div>
			</div>
		</main>
	);
}
