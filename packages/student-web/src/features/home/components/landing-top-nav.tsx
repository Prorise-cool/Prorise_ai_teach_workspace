import {
	ChevronDown,
	Languages,
	Menu,
	Moon,
	SunMedium,
	X
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { useTopNavControls } from '@/components/navigation/use-top-nav-controls';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover';
import { scrollToLandingSection } from '@/features/home/shared/landing-utils';

export type LandingNavLink = {
	href: string;
	label: string;
};

export type LandingFeaturePreview = {
	title: string;
	description: string;
};

export function LandingTopNav() {
	const { t } = useAppTranslation();
	const {
		closeLabel,
		closeMobileMenu,
		handleLocaleToggle,
		localeToggleLabel,
		mobileMenuOpen,
		openMenuLabel,
		setMobileMenuOpen,
		themeMode,
		themeModeLabel,
		toggleThemeMode
	} = useTopNavControls();
	
	const brandLabel = t('entryNav.brand');
	const links = t('entryNav.landingLinks', { returnObjects: true }) as LandingNavLink[];
	const featureLabel = t('entryNav.featureLabel');
	const featurePreview = t('entryNav.featurePreview', { returnObjects: true }) as LandingFeaturePreview[];

	function handleSectionNavigation(href: string) {
		closeMobileMenu();
		scrollToLandingSection(href);
	}

	return (
		<Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
			<header className="sticky top-0 z-40 px-5 pt-5 md:px-8">
				<nav className="xm-landing-glass-nav mx-auto flex w-[94%] max-w-screen-xl items-center justify-between gap-4 rounded-full border px-2 py-2 md:w-[82%] lg:w-[76%]">
					<button
						type="button"
						className="flex items-center gap-3 px-3 py-2 text-left text-lg font-bold"
						onClick={() => {
							handleSectionNavigation('#hero');
						}}
					>
						<span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
							<img
								src="/entry/logo.png"
								alt=""
								aria-hidden="true"
								className="h-full w-full object-contain"
							/>
						</span>
						<span>{brandLabel}</span>
					</button>

					<div className="hidden items-center gap-2 lg:flex">
						<Popover>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									className="rounded-full px-4 py-2 text-base hover:bg-muted/70"
								>
									<span>{featureLabel}</span>
									<ChevronDown className="h-4 w-4" />
								</Button>
							</PopoverTrigger>

							<PopoverContent
								className="xm-landing-nav__flyout w-[620px] max-w-[calc(100vw-32px)] p-4"
								align="center"
								sideOffset={14}
							>
								<div className="grid gap-5 md:grid-cols-2">
									<div className="overflow-hidden rounded-[var(--xm-radius-lg)] border border-border/60 bg-card">
										<img
											src="https://bu.dusays.com/2026/04/26/69edb5ab8dc8a.png"
											alt=""
											aria-hidden="true"
											className="h-full w-full object-cover"
										/>
									</div>

									<ul className="flex flex-col gap-2">
										{featurePreview.map(item => (
											<li
												key={item.title}
												className="rounded-[var(--xm-radius-lg)] p-4 text-sm transition-colors hover:bg-muted/70"
											>
												<p className="mb-1 font-semibold leading-none text-foreground">
													{item.title}
												</p>
												<p className="line-clamp-2 text-muted-foreground">
													{item.description}
												</p>
											</li>
										))}
									</ul>
								</div>
							</PopoverContent>
						</Popover>

						{links.map(link => (
							<Button
								type="button"
								key={link.href}
								variant="ghost"
								className="rounded-full px-4 py-2 text-base hover:bg-muted/70"
								onClick={() => {
									handleSectionNavigation(link.href);
								}}
							>
								{link.label}
							</Button>
						))}
					</div>

					<div className="hidden items-center gap-2 lg:flex">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="rounded-full hover:bg-muted/70"
							aria-label={themeModeLabel}
							onClick={toggleThemeMode}
						>
							{themeMode === 'dark' ? (
								<SunMedium className="h-5 w-5" />
							) : (
								<Moon className="h-5 w-5" />
							)}
						</Button>

						<Button
							type="button"
							variant="ghost"
							className="min-w-10 rounded-full px-3 py-2 text-sm font-semibold hover:bg-muted/70"
							aria-label={localeToggleLabel}
							onClick={handleLocaleToggle}
						>
							<Languages className="h-4 w-4" />
							<span>{localeToggleLabel}</span>
						</Button>
					</div>

					<div className="flex items-center gap-2 pr-2 lg:hidden">
						<Button
							type="button"
							variant="ghost"
							className="min-w-10 rounded-full px-3 py-2 text-sm font-semibold hover:bg-muted/70"
							aria-label={localeToggleLabel}
							onClick={handleLocaleToggle}
						>
							{localeToggleLabel}
						</Button>

						<DialogTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="rounded-full hover:bg-muted/70"
								aria-label={openMenuLabel}
							>
								<Menu className="h-5 w-5" />
							</Button>
						</DialogTrigger>
					</div>
				</nav>

				<DialogContent
					aria-describedby={undefined}
					className="xm-landing-nav__sheet-panel left-0 top-0 h-full w-[min(75vw,320px)] max-w-[320px] p-6 lg:hidden"
				>
					<div className="flex h-full flex-col justify-between">
						<div>
							<div className="mb-6 flex items-center justify-between">
								<DialogTitle className="sr-only">{brandLabel}</DialogTitle>

								<button
									type="button"
									className="flex items-center gap-3 font-semibold"
									onClick={() => {
										handleSectionNavigation('#hero');
									}}
								>
									<span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
										<img
											src="/entry/logo.png"
											alt=""
											aria-hidden="true"
											className="h-full w-full object-contain"
										/>
									</span>
									<span>{brandLabel}</span>
								</button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="rounded-full hover:bg-muted/70"
									aria-label={closeLabel}
									onClick={closeMobileMenu}
								>
									<X className="h-5 w-5" />
								</Button>
							</div>

							<div className="flex flex-col gap-2">
								{links.map(link => (
									<Button
										type="button"
										key={link.href}
										variant="ghost"
										className="justify-start rounded-[var(--xm-radius-lg)] px-4 py-3 text-left text-base hover:bg-muted/70"
										onClick={() => {
											handleSectionNavigation(link.href);
										}}
									>
										{link.label}
									</Button>
								))}
							</div>
						</div>

						<div className="flex flex-col gap-3">
							<div className="h-px w-full bg-border" />

							<Button
								type="button"
								variant="ghost"
								className="justify-start rounded-[var(--xm-radius-lg)] px-4 py-3 hover:bg-muted/70"
								aria-label={themeModeLabel}
								onClick={toggleThemeMode}
							>
								{themeMode === 'dark' ? (
									<>
										<SunMedium className="h-5 w-5" />
										<span>Light</span>
									</>
								) : (
									<>
										<Moon className="h-5 w-5" />
										<span>Dark</span>
									</>
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</header>
		</Dialog>
	);
}
