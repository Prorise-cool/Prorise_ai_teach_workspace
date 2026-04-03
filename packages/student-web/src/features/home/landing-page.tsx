/**
 * 文件说明：公开营销落地页。
 * 负责展示品牌价值、试点方案与联系入口，不承担鉴权逻辑。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ArrowRight,
  Blocks,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cookie,
  Crown,
  Drama,
  Ghost,
  Goal,
  Languages,
  Mail,
  Menu,
  Moon,
  MousePointerClick,
  Newspaper,
  Phone,
  PictureInPicture2,
  Puzzle,
  Sparkles,
  Squirrel,
  Star,
  SunMedium,
  TabletSmartphone,
  Vegan,
  Wallet,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  createLandingContactFormSchema,
  type LandingContactFormValues
} from '@/features/home/schemas/landing-contact-form-schema';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/shared/hooks/use-theme-mode';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

import '@/features/home/styles/entry-pages.scss';

type LandingNavLink = {
  href: string;
  label: string;
};

type LandingFeaturePreview = {
  title: string;
  description: string;
};

type LandingSponsorIconKey =
  | 'crown'
  | 'vegan'
  | 'ghost'
  | 'puzzle'
  | 'squirrel'
  | 'cookie'
  | 'drama';

type LandingSponsor = {
  label: string;
  icon: LandingSponsorIconKey;
};

type LandingBenefit = {
  title: string;
  description: string;
};

type LandingService = {
  title: string;
  description: string;
  pro: boolean;
};

type LandingReview = {
  name: string;
  role: string;
  comment: string;
};

type LandingPlan = {
  title: string;
  description: string;
  price: string;
  period: string;
  button: string;
  popular: boolean;
  benefits: string[];
};

type LandingFaq = {
  question: string;
  answer: string;
};

type LandingFooterGroup = {
  title: string;
  items: string[];
};

type ContactInfo = {
  locationTitle: string;
  locationValue: string;
  phoneTitle: string;
  phoneValue: string;
  mailTitle: string;
  mailValue: string;
  visitTitle: string;
  visitValue1: string;
  visitValue2: string;
};

type LandingStep = {
  badge: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
};

type LandingTopNavProps = {
  brandLabel: string;
  links: LandingNavLink[];
  featureLabel: string;
  featurePreview: LandingFeaturePreview[];
  localeLabel: string;
  openMenuLabel: string;
  closeLabel: string;
  themeLabel: string;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onToggleLocale: () => void;
  onNavigateSection: (href: string) => void;
};

type LandingTestimonialsCarouselProps = {
  reviews: LandingReview[];
  previousLabel: string;
  nextLabel: string;
};

/**
 * 生成 mailto 链接，用于最小化联系表单提交。
 *
 * @param state - 联系表单状态。
 * @param subjectFallback - 主题兜底文案。
 * @param targetEmail - 目标邮箱地址。
 * @returns 可直接打开邮箱客户端的 mailto 字符串。
 */
function buildMailToLink(
  state: LandingContactFormValues,
  subjectFallback: string,
  targetEmail: string
) {
  const subject = state.subject || subjectFallback;
  const body = [
    `Name: ${state.firstName}`,
    `Org / Role: ${state.lastName}`,
    `Email: ${state.email}`,
    '',
    state.message
  ].join('\n');

  return `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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

/**
 * 根据当前视口宽度推导轮播每屏卡片数。
 *
 * @param viewportWidth - 当前窗口宽度。
 * @returns 每屏卡片数量。
 */
function resolveSlidesPerView(viewportWidth: number) {
  if (viewportWidth >= 1024) {
    return 3;
  }

  if (viewportWidth >= 768) {
    return 2;
  }

  return 1;
}

function resolveCarouselFallbackSnapCount(reviewCount: number) {
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
function scrollToLandingSection(href: string, updateHash = true) {
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

/**
 * 渲染落地页专用的顶部胶囊导航。
 *
 * @param props - 导航参数。
 * @returns 导航节点。
 */
function LandingTopNav({
  brandLabel,
  links,
  featureLabel,
  featurePreview,
  localeLabel,
  openMenuLabel,
  closeLabel,
  themeLabel,
  themeMode,
  onToggleTheme,
  onToggleLocale,
  onNavigateSection
}: LandingTopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function handleSectionNavigation(href: string) {
    closeMobileMenu();
    onNavigateSection(href);
  }

  function handleLocaleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onToggleLocale();
  }

  return (
    <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <header className="sticky top-0 z-40 px-5 pt-5 md:px-8">
        <nav className="xm-landing-glass-nav mx-auto flex w-[94%] max-w-screen-xl items-center justify-between gap-4 rounded-full border px-2 py-2 md:w-[82%] lg:w-[76%]">
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 text-left text-lg font-bold"
            onClick={() => {
              onNavigateSection('#hero');
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
                      src="/entry/demo-img.jpg"
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
              aria-label={themeLabel}
              onClick={onToggleTheme}
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
              aria-label={localeLabel}
              onClick={handleLocaleClick}
            >
              <Languages className="h-4 w-4" />
              <span>{localeLabel}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 pr-2 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              className="min-w-10 rounded-full px-3 py-2 text-sm font-semibold hover:bg-muted/70"
              aria-label={localeLabel}
              onClick={handleLocaleClick}
            >
              {localeLabel}
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
                aria-label={themeLabel}
                onClick={onToggleTheme}
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

/**
 * 渲染公开落地页。
 *
 * @returns 落地页节点。
 */
export function LandingPage() {
  const { t } = useAppTranslation();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const location = useLocation();

  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true
  }) as LandingNavLink[];
  const featurePreview = t('entryNav.featurePreview', {
    returnObjects: true
  }) as LandingFeaturePreview[];
  const sponsorItems = t('landing.sponsors.items', {
    returnObjects: true
  }) as LandingSponsor[];
  const benefitItems = t('landing.benefits.items', {
    returnObjects: true
  }) as LandingBenefit[];
  const featureItems = t('landing.features.items', {
    returnObjects: true
  }) as LandingBenefit[];
  const serviceItems = t('landing.services.items', {
    returnObjects: true
  }) as LandingService[];
  const stepItems = t('landing.howItWorks.items', {
    returnObjects: true
  }) as LandingStep[];
  const reviewItems = t('landing.testimonials.reviews', {
    returnObjects: true
  }) as LandingReview[];
  const planItems = t('landing.pricing.plans', {
    returnObjects: true
  }) as LandingPlan[];
  const faqItems = t('landing.faq.items', {
    returnObjects: true
  }) as LandingFaq[];
  const footerGroups = t('landing.footer.groups', {
    returnObjects: true
  }) as LandingFooterGroup[];
  const contactInfo = t('landing.contact.info', {
    returnObjects: true
  }) as ContactInfo;
  const contactSubjectOptions = t('landing.contact.form.subjectOptions', {
    returnObjects: true
  }) as string[];
  const defaultContactSubject = contactSubjectOptions[0] ?? '';
  const contactFormSchema = useMemo(() => createLandingContactFormSchema(t), [t]);

  const [activeFaqIndex, setActiveFaqIndex] = useState(0);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: {
      errors: contactFormErrors,
      submitCount: contactSubmitCount
    }
  } = useForm<LandingContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      subject: defaultContactSubject,
      message: ''
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  const duplicateSponsors = useMemo(
    () => [...sponsorItems, ...sponsorItems],
    [sponsorItems]
  );

  const benefitIcons = [Blocks, Goal, Wallet, Sparkles];
  const featureIcons = [
    TabletSmartphone,
    Sparkles,
    MousePointerClick,
    PictureInPicture2,
    Newspaper,
    Goal
  ];

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

  const currentContactSubject = useWatch({
    control,
    name: 'subject'
  });
  const showContactFormError =
    contactSubmitCount > 0 && Object.keys(contactFormErrors).length > 0;

  useEffect(() => {
    if (contactSubjectOptions.includes(currentContactSubject)) {
      return;
    }

    setValue('subject', defaultContactSubject, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false
    });
  }, [
    contactSubjectOptions,
    currentContactSubject,
    defaultContactSubject,
    setValue
  ]);

  const submitContactForm = handleSubmit(values => {
    window.location.assign(
      buildMailToLink(
        values,
        t('landing.contact.form.subject'),
        contactInfo.mailValue
      )
    );
  });

  return (
    <main className="xm-landing-page pb-16">
      <LandingTopNav
        brandLabel={t('entryNav.brand')}
        links={navLinks}
        featureLabel={t('entryNav.featureLabel')}
        featurePreview={featurePreview}
        localeLabel={t('entryNav.localeToggle')}
        openMenuLabel={t('common.openMenu')}
        closeLabel={t('common.close')}
        themeLabel={
          themeMode === 'dark' ? t('common.themeLight') : t('common.themeDark')
        }
        themeMode={themeMode}
        onToggleTheme={toggleThemeMode}
        onToggleLocale={() => {
          const nextLocale =
            appI18n.resolvedLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';

          void appI18n.changeLanguage(nextLocale);
        }}
        onNavigateSection={scrollToLandingSection}
      />

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
                  ? '/entry/hero-image-dark.jpg'
                  : '/entry/hero-image-light.jpg'
              }
              alt={t('landing.hero.imageAlt')}
              className="xm-landing-hero-image w-full rounded-[var(--xm-radius-xl)] border border-t-2 border-[color:var(--xm-color-primary)] object-cover"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-[var(--xm-radius-xl)] bg-gradient-to-b from-background/0 via-background/50 to-background md:h-32" />
          </div>
        </div>
      </section>

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

      <section id="benefits" className="px-5 py-24 md:px-8 sm:py-32">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
          <div>
            <h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
              {t('landing.benefits.eyebrow')}
            </h2>
            <h3 className="mb-4 text-4xl font-bold">
              {t('landing.benefits.title')}
            </h3>
            <p className="text-xl text-muted-foreground">
              {t('landing.benefits.description')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {benefitItems.map((item, index) => {
              const Icon = benefitIcons[index];

              return (
                <article
                  key={item.title}
                  className="xm-landing-benefit-card rounded-[var(--xm-radius-lg)] border border-border bg-muted/50 p-6 hover:bg-background"
                >
                  <div className="mb-6 flex items-start justify-between">
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="xm-landing-benefit-card__index text-5xl font-medium">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h4 className="text-2xl font-semibold">{item.title}</h4>
                  <p className="mt-4 leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="px-5 py-24 md:px-8 sm:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="text-center">
            <h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
              {t('landing.features.eyebrow')}
            </h2>
            <h3 className="mb-4 text-4xl font-bold">
              {t('landing.features.title')}
            </h3>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
              {t('landing.features.description')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureItems.map((item, index) => {
              const Icon = featureIcons[index];

              return (
                <article
                  key={item.title}
                  className="rounded-[var(--xm-radius-lg)] p-6 text-center"
                >
                  <div className="xm-landing-style-ring mx-auto mb-4 inline-flex rounded-full p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-2xl font-semibold">{item.title}</h4>
                  <p className="mt-4 leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="services" className="px-5 py-24 md:px-8 sm:py-32">
        <div className="mx-auto max-w-[1440px] text-center">
          <h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
            {t('landing.services.eyebrow')}
          </h2>
          <h3 className="mb-4 text-4xl font-bold">
            {t('landing.services.title')}
          </h3>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            {t('landing.services.description')}
          </p>

          <div className="mx-auto grid max-w-[860px] gap-4 md:grid-cols-2">
            {serviceItems.map(item => (
              <article
                key={item.title}
                className="relative rounded-[var(--xm-radius-lg)] border border-border bg-muted/60 p-6 text-left"
              >
                <h4 className="text-2xl font-semibold">{item.title}</h4>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>

                {item.pro ? (
                  <span className="absolute -right-3 -top-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    PRO
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-24 md:px-8 sm:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
              {t('landing.howItWorks.eyebrow')}
            </h2>
            <h3 className="text-4xl font-bold">{t('landing.howItWorks.title')}</h3>
          </div>

          <div className="mx-auto max-w-[1120px]">
            {stepItems.map((item, index) => (
              <div
                key={item.title}
                className={cn(
                  'mb-8 flex items-center gap-6',
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
                  <div className="absolute h-60 w-48 rounded-full bg-primary/20 blur-3xl" />
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    className="relative mx-auto w-[220px] object-contain md:w-[280px] lg:w-[320px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <section id="pricing" className="px-5 py-24 md:px-8 sm:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="text-center">
            <h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
              {t('landing.pricing.eyebrow')}
            </h2>
            <h3 className="mb-4 text-4xl font-bold">{t('landing.pricing.title')}</h3>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
              {t('landing.pricing.description')}
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {planItems.map(plan => (
              <article
                key={plan.title}
                className={cn(
                  'rounded-[var(--xm-radius-lg)] border p-6',
                  plan.popular
                    ? 'drop-shadow-xl shadow-black/10 dark:shadow-white/10 border-[1.5px] border-primary lg:scale-[1.04]'
                    : 'border-border bg-card'
                )}
              >
                <h4 className="pb-2 text-2xl font-semibold">{plan.title}</h4>
                <p className="pb-4 text-sm text-muted-foreground">{plan.description}</p>
                <div>
                  <span className="text-3xl font-bold">¥{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <div className="mt-8 space-y-4">
                  {plan.benefits.map(benefit => (
                    <span key={benefit} className="flex items-center text-sm">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      {benefit}
                    </span>
                  ))}
                </div>

                <a
                  href="#contact"
                  className={cn(
                    'mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition',
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:brightness-105'
                      : 'border border-border bg-secondary text-secondary-foreground hover:bg-accent'
                  )}
                  onClick={event => {
                    event.preventDefault();
                    scrollToLandingSection('#contact');
                  }}
                >
                  {plan.button}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="px-5 py-24 md:px-8 sm:py-32">
        <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
              {t('landing.contact.eyebrow')}
            </h2>
            <h3 className="text-4xl font-bold">{t('landing.contact.title')}</h3>
            <p className="mb-8 mt-4 max-w-xl text-muted-foreground">
              {t('landing.contact.description')}
            </p>

            <div className="flex flex-col gap-5">
              <div>
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <Goal className="h-5 w-5" />
                  {contactInfo.locationTitle}
                </div>
                <div>{contactInfo.locationValue}</div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <Phone className="h-5 w-5" />
                  {contactInfo.phoneTitle}
                </div>
                <div>{contactInfo.phoneValue}</div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <Mail className="h-5 w-5" />
                  {contactInfo.mailTitle}
                </div>
                <div>{contactInfo.mailValue}</div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <Clock3 className="h-5 w-5" />
                  {contactInfo.visitTitle}
                </div>
                <div>{contactInfo.visitValue1}</div>
                <div>{contactInfo.visitValue2}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--xm-radius-lg)] border border-border bg-muted/60 p-6">
            <form
              className="grid gap-4"
              noValidate
              onSubmit={event => {
                void submitContactForm(event);
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex w-full flex-col gap-1.5">
                  <Label
                    className="text-sm font-medium"
                    htmlFor="contact-first-name"
                  >
                    {t('landing.contact.form.firstName')}
                  </Label>
                  <Input
                    id="contact-first-name"
                    placeholder={t('landing.contact.form.firstNamePlaceholder')}
                    aria-invalid={Boolean(contactFormErrors.firstName)}
                    {...register('firstName')}
                  />

                  {contactFormErrors.firstName?.message ? (
                    <p className="text-sm text-destructive">
                      {contactFormErrors.firstName.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex w-full flex-col gap-1.5">
                  <Label
                    className="text-sm font-medium"
                    htmlFor="contact-last-name"
                  >
                    {t('landing.contact.form.lastName')}
                  </Label>
                  <Input
                    id="contact-last-name"
                    placeholder={t('landing.contact.form.lastNamePlaceholder')}
                    {...register('lastName')}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium" htmlFor="contact-email">
                  {t('landing.contact.form.email')}
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder={t('landing.contact.form.emailPlaceholder')}
                  aria-invalid={Boolean(contactFormErrors.email)}
                  {...register('email')}
                />

                {contactFormErrors.email?.message ? (
                  <p className="text-sm text-destructive">
                    {contactFormErrors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium" htmlFor="contact-subject">
                  {t('landing.contact.form.subject')}
                </Label>
                <select
                  id="contact-subject"
                  className="xm-landing-field"
                  aria-invalid={Boolean(contactFormErrors.subject)}
                  {...register('subject')}
                >
                  {contactSubjectOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                {contactFormErrors.subject?.message ? (
                  <p className="text-sm text-destructive">
                    {contactFormErrors.subject.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium" htmlFor="contact-message">
                  {t('landing.contact.form.message')}
                </Label>
                <Textarea
                  id="contact-message"
                  rows={5}
                  className="min-h-[120px] resize-y"
                  placeholder={t('landing.contact.form.messagePlaceholder')}
                  aria-invalid={Boolean(contactFormErrors.message)}
                  {...register('message')}
                />

                {contactFormErrors.message?.message ? (
                  <p className="text-sm text-destructive">
                    {contactFormErrors.message.message}
                  </p>
                ) : null}
              </div>

              {showContactFormError ? (
                <div className="xm-landing-contact-alert rounded-[var(--xm-radius-lg)] border border-destructive/40 px-4 py-3">
                  <div className="font-semibold text-destructive">
                    {t('landing.contact.form.errorTitle')}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {t('landing.contact.form.errorDescription')}
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="mt-4"
              >
                {t('landing.contact.form.button')}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <section id="faq" className="px-5 py-24 md:px-8 sm:py-32">
        <div className="mx-auto max-w-[700px]">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-lg tracking-[0.2em] text-primary">
              {t('landing.faq.eyebrow')}
            </h2>
            <h3 className="text-4xl font-bold">{t('landing.faq.title')}</h3>
          </div>

          <div>
            {faqItems.map((item, index) => {
              const isOpen = activeFaqIndex === index;

              return (
                <div key={item.question} className="border-b border-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-4 text-left text-base font-medium"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setActiveFaqIndex(currentIndex =>
                        currentIndex === index ? -1 : index
                      );
                    }}
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform',
                        isOpen ? 'rotate-180' : null
                      )}
                    />
                  </button>

                  <div
                    className="xm-landing-accordion-content"
                    style={{
                      maxHeight: isOpen ? '320px' : '0px'
                    }}
                  >
                    <div className="pb-4 text-sm leading-7 text-muted-foreground">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h4 className="mt-4 font-medium">
            <span>{t('landing.faq.stillHaveQuestions')}</span>
            <a
              href="#contact"
              className="ml-2 underline text-muted-foreground"
              onClick={event => {
                event.preventDefault();
                scrollToLandingSection('#contact');
              }}
            >
              {t('landing.faq.contactUs')}
            </a>
          </h4>
        </div>
      </section>

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

    </main>
  );
}
