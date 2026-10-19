import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  ArrowRightIcon, CalendarCheckIcon, CameraIcon, CheckIcon, ChevronDownIcon, CoffeeIcon, DatabaseIcon, DumbbellIcon,
  Flower2Icon, GlobeIcon, HotelIcon, HouseIcon, KeyRoundIcon, LayoutTemplateIcon, LockIcon, MonitorSmartphoneIcon,
  MotorbikeIcon, PaletteIcon, PenToolIcon, RocketIcon, ScissorsIcon, SearchCheckIcon, ServerIcon, ShirtIcon,
  SparklesIcon, TicketIcon, UtensilsIcon, XIcon, ZapIcon,
} from 'lucide-react';
import { cn } from 'cn';

import BrandLogo from 'src/components/common/BrandLogo';
import LanguageSelector from 'src/components/common/LanguageSelector';
import LinkButton from 'src/components/common/LinkButton';
import Reveal from 'src/components/common/Reveal';
import { Button } from 'src/components/shadui/button';
import BusinessOrbit from 'src/components/pages/landing/BusinessOrbit';
import DotGridBackdrop from 'src/components/pages/landing/DotGridBackdrop';
import HeroShowcase from 'src/components/pages/landing/HeroShowcase';
import HowItWorks from 'src/components/pages/landing/HowItWorks';
import ShowcaseZoom from 'src/components/pages/landing/ShowcaseZoom';
import {
  BoutiqueSite, CafeSite, HotelSite, LakeHouseSite, MotoRentalSite, PerfumeSite,
} from 'src/components/pages/landing/ExampleSites';
import PerfumeBottleIcon from 'src/components/pages/landing/PerfumeBottleIcon';
import { APP_NAME, PATHS } from 'src/utils/constants';
import type { ArtIcon } from 'src/types/landing';
import { getPriceLabels } from 'src/services/pricing';

// The landing page runs wider than the app's content column (MAIN_CONTENT_WIDTH_CLASS).
const LANDING_WIDTH_CLASS = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
// One gap between sections, everywhere. Each section pads only its bottom, so the gap above a section is the
// one its neighbour leaves (two paddings back to back would double it). References: ShowcaseZoom.
const SECTION_PAD_BOTTOM_CLASS = 'pb-14 sm:pb-20';

// Every "start" button goes to the projects page. Visitors who aren't signed in get bounced through login
// (or sign-up) by ProtectedRoute and land there afterwards: on their list, not straight in the new-project
// form, so returning users see their work first and new ones get the empty state's "create" button.
const START_PATH = PATHS.projects;

// The brand gradient, for primary buttons and for emphasised headline words.
// Hover darkens through a filter instead of fading the fill (bg-primary/85), so the dot grid never shows through.
const BRAND_BUTTON_CLASS = 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary hover:brightness-95';
const BRAND_TEXT_CLASS = 'bg-linear-to-r from-brand-light via-brand-strong to-brand-deep bg-clip-text text-transparent';

// Gap between neighbouring cards fading in on scroll (see Reveal), so a row arrives one card at a time.
const STAGGER_MS = 120;

const HERO_PERK_KEYS = ['landing_perk_no_code', 'landing_perk_no_jargon', 'landing_perk_all_included', 'landing_adv_tick_changes'];
// The hero's second row: what the finished site is like (rather than what using VibeIt is like).
const HERO_QUALITIES: { id: string; labelKey: string; Icon: ArtIcon }[] = [
  { id: 'design', labelKey: 'landing_adv_design_title', Icon: PenToolIcon },
  { id: 'seo', labelKey: 'landing_adv_seo_title', Icon: SearchCheckIcon },
  { id: 'speed', labelKey: 'landing_adv_speed_title', Icon: ZapIcon },
  { id: 'responsive', labelKey: 'landing_adv_responsive_title', Icon: MonitorSmartphoneIcon },
];

const BUSINESSES: { id: string; labelKey: string; Icon: ArtIcon }[] = [
  { id: 'motorbike', labelKey: 'landing_biz_motorbike', Icon: MotorbikeIcon },
  { id: 'house', labelKey: 'landing_biz_house', Icon: HouseIcon },
  { id: 'hotel', labelKey: 'landing_biz_hotel', Icon: HotelIcon },
  { id: 'clothes', labelKey: 'landing_biz_clothes', Icon: ShirtIcon },
  { id: 'perfume', labelKey: 'landing_biz_perfume', Icon: PerfumeBottleIcon },
  { id: 'cafe', labelKey: 'landing_biz_cafe', Icon: UtensilsIcon },
  { id: 'salon', labelKey: 'landing_biz_salon', Icon: ScissorsIcon },
  { id: 'photo', labelKey: 'landing_biz_photo', Icon: CameraIcon },
  { id: 'events', labelKey: 'landing_biz_events', Icon: TicketIcon },
  { id: 'flowers', labelKey: 'landing_biz_flowers', Icon: Flower2Icon },
  { id: 'gym', labelKey: 'landing_biz_gym', Icon: DumbbellIcon },
  { id: 'portfolio', labelKey: 'landing_biz_portfolio', Icon: PaletteIcon },
];

// Intentions: the "who does what" split is the core pitch — the user's list is deliberately short, ours
// is deliberately long, and the size difference between the two cards is the point.
const YOUR_TASK_KEYS = ['landing_deal_yours_1', 'landing_deal_yours_2', 'landing_deal_yours_3'];

const OUR_TASKS: { id: string; labelKey: string; Icon: ArtIcon }[] = [
  { id: 'design', labelKey: 'landing_deal_ours_design', Icon: PenToolIcon },
  { id: 'pages', labelKey: 'landing_deal_ours_pages', Icon: LayoutTemplateIcon },
  { id: 'booking', labelKey: 'landing_deal_ours_booking', Icon: CalendarCheckIcon },
  { id: 'accounts', labelKey: 'landing_deal_ours_accounts', Icon: KeyRoundIcon },
  { id: 'data', labelKey: 'landing_deal_ours_data', Icon: DatabaseIcon },
  { id: 'hosting', labelKey: 'landing_deal_ours_hosting', Icon: ServerIcon },
  { id: 'domain', labelKey: 'landing_deal_ours_domain', Icon: GlobeIcon },
  { id: 'security', labelKey: 'landing_deal_ours_security', Icon: LockIcon },
  { id: 'launch', labelKey: 'landing_deal_ours_launch', Icon: RocketIcon },
];

// Made-up example sites, each a different kind of business with its own look. The addresses are
// translated and deliberately read as placeholders ("your…") so nobody mistakes them for real sites.
const SHOWCASE_SITES: { id: string; domainKey: string; typeKey: string; descKey: string; Site: () => React.ReactNode }[] = [
  { id: 'moto', domainKey: 'landing_example_domain_moto', typeKey: 'landing_biz_motorbike', descKey: 'landing_site_moto_desc', Site: MotoRentalSite },
  { id: 'house', domainKey: 'landing_example_domain_house', typeKey: 'landing_biz_house', descKey: 'landing_site_house_desc', Site: LakeHouseSite },
  { id: 'hotel', domainKey: 'landing_example_domain_hotel', typeKey: 'landing_biz_hotel', descKey: 'landing_site_hotel_desc', Site: HotelSite },
  { id: 'clothes', domainKey: 'landing_example_domain_clothes', typeKey: 'landing_biz_clothes', descKey: 'landing_site_clothes_desc', Site: BoutiqueSite },
  { id: 'perfume', domainKey: 'landing_example_domain_perfume', typeKey: 'landing_biz_perfume', descKey: 'landing_site_perfume_desc', Site: PerfumeSite },
  { id: 'cafe', domainKey: 'landing_example_domain_cafe', typeKey: 'landing_biz_cafe', descKey: 'landing_site_cafe_desc', Site: CafeSite },
];

// The hero's big browser cycles through these (the rest still show in the gallery further down).
const HERO_SITE_IDS = ['moto', 'hotel', 'cafe', 'clothes'];

const COMPARE_ROWS = [
  { id: 'time', usualKey: 'landing_compare_time_usual', vib3Key: 'landing_compare_time_vib3' },
  { id: 'talk', usualKey: 'landing_compare_talk_usual', vib3Key: 'landing_compare_talk_vib3' },
  { id: 'hosting', usualKey: 'landing_compare_host_usual', vib3Key: 'landing_compare_host_vib3' },
  { id: 'changes', usualKey: 'landing_compare_change_usual', vib3Key: 'landing_compare_change_vib3' },
];

const FAQS = [
  { id: 'skills', questionKey: 'landing_faq_skills_q', answerKey: 'landing_faq_skills_a' },
  { id: 'unsure', questionKey: 'landing_faq_unsure_q', answerKey: 'landing_faq_unsure_a' },
  { id: 'changes', questionKey: 'landing_faq_changes_q', answerKey: 'landing_faq_changes_a' },
  { id: 'hosting', questionKey: 'landing_faq_hosting_q', answerKey: 'landing_faq_hosting_a' },
  // Takes the price params (services/pricing), like every text that mentions a price.
  { id: 'cost', questionKey: 'landing_faq_cost_q', answerKey: 'landing_faq_cost_a' },
];

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <Reveal className='mx-auto max-w-2xl text-center'>
      {eyebrow && <span className='text-xs font-bold tracking-[0.18em] text-brand-strong uppercase'>{eyebrow}</span>}
      <h2 className='mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl'>{title}</h2>
      {subtitle && <p className='mt-4 text-pretty text-muted-foreground sm:text-lg'>{subtitle}</p>}
    </Reveal>
  );
}

function CheckBullet() {
  return (
    <span className='grid size-5 shrink-0 place-items-center rounded-full bg-primary/12 text-brand-strong'>
      <CheckIcon className='size-3' strokeWidth={3} />
    </span>
  );
}

function LandingHeader() {
  const { t } = useTranslation();

  return (
    <header className='sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md'>
      <div className={cn(LANDING_WIDTH_CLASS, 'flex h-16 items-center justify-between gap-3')}>
        <Link to='/' className='rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
          <BrandLogo />
        </Link>
        <div className='flex items-center gap-1 sm:gap-2'>
          {/* Phones: no room next to the logo; Pricing is in the footer there. */}
          <Link to={PATHS.pricing} className='hidden rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline'>
            {t('pricing_nav')}
          </Link>
          <LanguageSelector />
          <LinkButton href={START_PATH} size='sm' className={BRAND_BUTTON_CLASS}>{t('landing_nav_start')}</LinkButton>
        </div>
      </div>
    </header>
  );
}

// Original purpose: the top of the landing page.
// Intentions: the promise in three short lines ("You dream. We build. You own."), centred, with the way in
// right under it, and then the big picture: a real-looking website, tilted like a product shot, that
// flattens as you scroll and lets you flip between example sites (HeroShowcase).
function HeroSection() {
  const { t } = useTranslation();

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section data-section='hero' className='relative isolate overflow-hidden'>
      {/* Half the usual section gap on top: the header is right above. */}
      <div className={cn(LANDING_WIDTH_CLASS, SECTION_PAD_BOTTOM_CLASS, 'flex flex-col items-center pt-7 text-center sm:pt-10')}>
        {/* min-w-0 lets this column shrink below its longest word, so long words wrap instead of overflowing */}
        <Reveal className='flex min-w-0 flex-col items-center'>
          <span className='inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-xs'>
            <SparklesIcon className='size-3.5 text-brand-strong' />
            {t('landing_hero_eyebrow')}
          </span>
          <h1 className='mt-6 font-heading text-[clamp(2.5rem,12vw,3.25rem)] leading-[1.06] font-semibold tracking-[-0.025em] break-words hyphens-auto sm:text-7xl xl:text-[5.25rem]'>
            <span className='block'>{t('landing_hero_title_lead')}</span>
            {/* pb: descenders (Vietnamese marks too) poke out of the clipped gradient box otherwise. */}
            <span className={cn('block pb-[0.06em]', BRAND_TEXT_CLASS)}>{t('landing_hero_title_build')}</span>
            <span className='block'>{t('landing_hero_title_rest')}</span>
          </h1>
          <p className='mt-6 max-w-2xl text-lg text-pretty text-muted-foreground'>{t('landing_hero_subtitle')}</p>
          {/* Two equal columns so both buttons come out the same size. */}
          <div className='mt-8 grid w-full max-w-sm grid-cols-1 gap-3 min-[380px]:grid-cols-2'>
            <LinkButton href={START_PATH} size='lg' className={cn(BRAND_BUTTON_CLASS, 'w-full')}>
              {t('landing_cta_start')}
              <ArrowRightIcon data-icon='inline-end' />
            </LinkButton>
            <Button size='lg' variant='outline' className='w-full bg-card hover:bg-accent' onClick={scrollToHowItWorks}>
              {t('landing_cta_how')}
            </Button>
          </div>
          <ul className='mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium'>
            {HERO_PERK_KEYS.map(perkKey => (
              <li key={perkKey} className='flex items-center gap-1.5'>
                <CheckBullet />
                {t(perkKey)}
              </li>
            ))}
          </ul>
          <ul className='mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground'>
            {HERO_QUALITIES.map(quality => (
              <li key={quality.id} data-qualityid={quality.id} className='flex items-center gap-1.5'>
                <quality.Icon className='size-4 text-brand-strong' strokeWidth={1.75} />
                {t(quality.labelKey)}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delayMs={150} className='mt-14 w-full max-w-5xl'>
          <HeroShowcase sites={_.filter(SHOWCASE_SITES, site => _.includes(HERO_SITE_IDS, site.id))} />
        </Reveal>
      </div>
    </section>
  );
}

// Original purpose: "made for whatever you run": the kinds of businesses VibeIt builds for (see BusinessOrbit).
function BusinessesSection() {
  const { t } = useTranslation();

  return (
    <section data-section='businesses' className={cn(LANDING_WIDTH_CLASS, SECTION_PAD_BOTTOM_CLASS, 'overflow-x-clip')}>
      <Reveal>
        <BusinessOrbit businesses={BUSINESSES} title={t('landing_made_for_title')} />
      </Reveal>
    </section>
  );
}

function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    // scroll-mt keeps the heading clear of the sticky header when the hero button scrolls here.
    <section id='how-it-works' data-section='how-it-works' className={cn(LANDING_WIDTH_CLASS, SECTION_PAD_BOTTOM_CLASS, 'scroll-mt-16')}>
      <SectionHeading eyebrow={t('landing_how_eyebrow')} title={t('landing_how_title')} />
      <HowItWorks className='mt-12' />
    </section>
  );
}

function DealSection() {
  const { t } = useTranslation();

  return (
    <section data-section='deal' className={cn(LANDING_WIDTH_CLASS, SECTION_PAD_BOTTOM_CLASS)}>
      <SectionHeading eyebrow={t('landing_deal_eyebrow')} title={t('landing_deal_title')} subtitle={t('landing_deal_subtitle')} />
      <div className='mt-12 grid gap-4 lg:grid-cols-5'>
        <Reveal className='flex flex-col rounded-3xl border bg-card p-6 sm:p-8 lg:col-span-2'>
          <h3 className='font-heading text-xl font-bold'>{t('landing_deal_yours')}</h3>
          <ol className='mt-6 mb-8 flex flex-col gap-4'>
            {YOUR_TASK_KEYS.map((taskKey, index) => (
              <li key={taskKey} className='flex items-center gap-3'>
                <span className='grid size-8 shrink-0 place-items-center rounded-full bg-accent font-heading text-sm font-bold text-accent-foreground'>{index + 1}</span>
                <span className='font-medium'>{t(taskKey)}</span>
              </li>
            ))}
          </ol>
          <p className='mt-auto flex items-center gap-2 border-t pt-5 text-sm text-muted-foreground'>
            <CoffeeIcon className='size-4 shrink-0' />
            {t('landing_deal_yours_time')}
          </p>
        </Reveal>
        <Reveal delayMs={STAGGER_MS} className='rounded-3xl bg-linear-to-br from-highlight to-chart-2 p-6 text-primary-foreground shadow-xl shadow-primary/20 sm:p-8 lg:col-span-3'>
          <div className='flex items-center justify-between gap-3'>
            <h3 className='font-heading text-xl font-bold'>{t('landing_deal_ours')}</h3>
            <span className='rounded-full bg-primary-foreground px-3 py-1 text-xs font-semibold text-primary'>{t('landing_deal_ours_badge')}</span>
          </div>
          <ul className='mt-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3'>
            {OUR_TASKS.map(task => (
              <li key={task.id} data-taskid={task.id} className='flex items-center gap-3 rounded-xl bg-primary-foreground/10 px-3.5 py-3 text-sm font-semibold'>
                <task.Icon className='size-4.5 shrink-0' />
                {t(task.labelKey)}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  const { t } = useTranslation();
  return (
    <ShowcaseZoom
      sites={SHOWCASE_SITES}
      heading={<SectionHeading eyebrow={t('landing_showcase_eyebrow')} title={t('landing_showcase_title')} subtitle={t('landing_showcase_subtitle')} />}
      footer={(
        <Reveal className='mt-12 flex justify-center'>
          <LinkButton href={START_PATH} size='lg' className={cn(BRAND_BUTTON_CLASS, 'w-[186px]')}>
            {t('landing_cta_start')}
            <ArrowRightIcon data-icon='inline-end' />
          </LinkButton>
        </Reveal>
      )}
    />
  );
}

function CompareSection() {
  const { t } = useTranslation();

  return (
    <section data-section='compare' className={cn(LANDING_WIDTH_CLASS, SECTION_PAD_BOTTOM_CLASS)}>
      <SectionHeading title={t('landing_compare_title')} />
      {/* One grid of [usual, vib3] cell pairs (not two columns), so each row's cells share a height */}
      <Reveal className='mx-auto mt-10 grid max-w-3xl grid-cols-2 overflow-hidden rounded-3xl border bg-card shadow-xs'>
        <div className='border-r p-4 text-sm font-bold text-muted-foreground sm:p-5'>{t('landing_compare_usual')}</div>
        <div className='bg-accent p-4 font-heading text-sm font-bold text-accent-foreground sm:p-5'>{t('landing_compare_vib3', { appName: APP_NAME })}</div>
        {COMPARE_ROWS.map(row => [
          <div key={`${row.id}-usual`} data-compareid={row.id} className='flex items-start gap-2.5 border-t border-r p-4 text-sm text-muted-foreground sm:p-5 sm:text-base'>
            <XIcon className='mt-0.5 size-4 shrink-0' />
            {t(row.usualKey)}
          </div>,
          <div key={`${row.id}-vib3`} data-compareid={row.id} className='flex items-start gap-2.5 border-t bg-accent/50 p-4 text-sm font-semibold sm:p-5 sm:text-base'>
            <CheckIcon className='mt-0.5 size-4 shrink-0 text-brand-strong' strokeWidth={3} />
            {t(row.vib3Key)}
          </div>,
        ])}
      </Reveal>
    </section>
  );
}

function FaqSection() {
  const { t, i18n } = useTranslation();
  const prices = getPriceLabels(i18n.language);

  return (
    <section data-section='faq' className={cn(LANDING_WIDTH_CLASS, SECTION_PAD_BOTTOM_CLASS)}>
      <SectionHeading title={t('landing_faq_title')} />
      <Reveal className='mx-auto mt-10 flex max-w-3xl flex-col gap-3'>
        {FAQS.map(faq => (
          // Native <details>: open/close for free, no JS state, and it works with the keyboard.
          <details key={faq.id} data-faqid={faq.id} className='group rounded-2xl border bg-card px-5 py-4 open:shadow-sm'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-4 font-heading font-semibold [&::-webkit-details-marker]:hidden'>
              {t(faq.questionKey)}
              <ChevronDownIcon className='size-4 shrink-0 text-brand-strong transition-transform group-open:rotate-180' />
            </summary>
            <p className='mt-3 text-muted-foreground'>{t(faq.answerKey, prices)}</p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}

function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className='border-t bg-card text-muted-foreground'>
      <div className={cn(LANDING_WIDTH_CLASS, 'flex flex-col items-center justify-between gap-3 py-8 text-sm sm:flex-row')}>
        <div className='flex items-center gap-2'>
          <BrandLogo hasWordmark={false} markClassName='h-6' />
          {t('landing_footer_rights', { year: new Date().getFullYear(), appName: APP_NAME })}
        </div>
        <div className='flex items-center gap-4'>
          <Link to={PATHS.pricing} className='hover:text-foreground'>{t('pricing_nav')}</Link>
          <Link to={PATHS.privacyPolicy} className='hover:text-foreground'>{t('landing_footer_privacy')}</Link>
          <Link to={PATHS.cookiePolicy} className='hover:text-foreground'>{t('cookie_policy_title')}</Link>
        </div>
      </div>
    </footer>
  );
}

// Original purpose: the public front door at `/` for visitors who aren't signed in.
// Intentions: sells one idea — you just talk, we do the building, hosting, domain and launch — in a clean,
// product-style layout: hero, how it works, who does what, comparison, FAQ, who it's for, and examples to close.
// Pinned to the light theme (`force-light`) whatever the app theme is.
export default function Landing() {
  return (
    <div data-page='landing' className='force-light relative isolate min-h-svh bg-background text-foreground'>
      {/* Behind everything; it shows wherever a section leaves the background bare. */}
      <DotGridBackdrop className='-z-10' />
      <LandingHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <DealSection />
        <CompareSection />
        <FaqSection />
        <BusinessesSection />
        <ShowcaseSection />
      </main>
      <LandingFooter />
    </div>
  );
}
