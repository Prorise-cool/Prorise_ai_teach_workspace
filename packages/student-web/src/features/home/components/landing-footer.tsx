import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { scrollToLandingSection } from '@/features/home/shared/landing-utils';

export type LandingFooterGroup = {
	title: string;
	items: string[];
};

export function LandingFooter() {
	const { t } = useAppTranslation();
	const footerGroups = t('landing.footer.groups', {
		returnObjects: true
	}) as LandingFooterGroup[];

	return (
		<footer id="footer" className="px-5 pt-8 md:px-8">
			<div className="mx-auto max-w-[1440px] rounded-[var(--xm-radius-xl)] border border-border bg-muted/50 p-10">
				<div className="grid gap-x-12 gap-y-8 md:grid-cols-4 xl:grid-cols-6">
					<div className="md:col-span-2 xl:col-span-2">
						<a
							href="#hero"
							className="flex items-center gap-3 font-bold"
							onClick={event => {
								event.preventDefault();
								scrollToLandingSection('#hero');
							}}
						>
							<span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-background/80">
								<img
									src="/entry/logo.png"
									alt=""
									aria-hidden="true"
									className="h-full w-full object-contain"
								/>
							</span>
							<h3 className="text-2xl">{t('landing.footer.brand')}</h3>
						</a>
					</div>

					{footerGroups.map(group => (
						<div key={group.title} className="flex flex-col gap-2">
							<h3 className="text-lg font-bold">{group.title}</h3>
							{group.items.map(item => (
								<a
									key={item}
									href="#contact"
									className="opacity-60 transition hover:opacity-100"
									onClick={event => {
										event.preventDefault();
										scrollToLandingSection('#contact');
									}}
								>
									{item}
								</a>
							))}
						</div>
					))}
				</div>

				<div className="my-6 h-px bg-border" />
				<section>
					<h3 className="text-sm text-muted-foreground">
						{t('landing.footer.copyright')}
					</h3>
				</section>
			</div>
		</footer>
	);
}
