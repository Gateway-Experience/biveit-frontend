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
import ScaledFrame from 'src/components/common/ScaledFrame';
import { Button } from 'src/components/shadui/button';
import { BrowserDots, ChatPreviewCard, HeroVisual } from 'src/components/pages/landing/HeroVisual';
import { LaptopShowcase } from 'src/components/pages/landing/DeviceMockups';
import {
  BoutiqueSite, CafeSite, HotelSite, LakeHouseSite, MotoRentalSite, PerfumeSite,
} from 'src/components/pages/landing/ExampleSites';
import PerfumeBottleIcon from 'src/components/pages/landing/PerfumeBottleIcon';
import { APP_NAME, PATHS } from 'src/utils/constants';
import type { ArtIcon } from 'src/types/landing';

// The landing page runs wider than the app's content column (MAIN_CONTENT_WIDTH_CLASS).
const LANDING_WIDTH_CLASS = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

// Every "start" button goes straight to the new-project form. Visitors who aren't signed in get
// bounced through login by ProtectedRoute and land back there afterwards.
const START_PATH = PATHS.newProject;

// The brand gradient, for primary buttons and for emphasised headline words.
const BRAND_BUTTON_CLASS = 'bg-linear-to-r from-primary to-brand-deep text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90';
const BRAND_TEXT_CLASS = 'bg-linear-to-r from-brand-light via-primary to-brand-deep bg-clip-text text-transparent';

// Gap between neighbouring cards fading in on scroll (see Reveal), so a row arrives one card at a time.
const STAGGER_MS = 120;

const HERO_PERK_KEYS = ['landing_perk_no_code', 'landing_perk_no_jargon', 'landing_perk_all_included'];

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

const ADVANTAGES: { id: string; titleKey: string; descKey: string; Icon: ArtIcon }[] = [
  { id: 'design', titleKey: 'landing_adv_design_title', descKey: 'landing_adv_design_desc', Icon: PenToolIcon },
  { id: 'seo', titleKey: 'landing_adv_seo_title', descKey: 'landing_adv_seo_desc', Icon: SearchCheckIcon },
  { id: 'speed', titleKey: 'landing_adv_speed_title', descKey: 'landing_adv_speed_desc', Icon: ZapIcon },
  { id: 'responsive', titleKey: 'landing_adv_responsive_title', descKey: 'landing_adv_responsive_desc', Icon: MonitorSmartphoneIcon },
];

const ADVANTAGE_TICK_KEYS = ['landing_adv_tick_time', 'landing_adv_tick_changes', 'landing_adv_tick_custom'];

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

const STEPS = [
  { id: 'talk', titleKey: 'landing_step1_title', descKey: 'landing_step1_body' },
  { id: 'build', titleKey: 'landing_step2_title', descKey: 'landing_step2_body' },
  { id: 'live', titleKey: 'landing_step3_title', descKey: 'landing_step3_body' },
];

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
];

// Static decoration behind a section: soft purple glows and a few faint concentric rings in the
// bottom-left corner. Needs a `relative isolate overflow-hidden` parent.
function SoftGlowBackdrop() {
  return (
    <div aria-hidden='true' className='pointer-events-none absolute inset-0 -z-10'>
      <div className='absolute -top-48 right-[-12%] size-[680px] rounded-full bg-primary/15 blur-[130px]' />
      <div className='absolute top-1/3 -left-48 size-[460px] rounded-full bg-brand-light/20 blur-[110px]' />
      <div className='absolute -bottom-[520px] -left-[520px] grid size-[1040px] place-items-center'>
        {['size-[560px]', 'size-[760px]', 'size-[960px]'].map(sizeClass => (
          <span key={sizeClass} className={cn('absolute rounded-full border border-primary/10', sizeClass)} />
        ))}
      </div>
    </div>
  );
}

// The "— • •" accent under the big headlines.
function HeadlineAccent({ className }: { className?: string }) {
  return (
    <div aria-hidden='true' className={cn('flex items-center gap-1.5', className)}>
      <span className='h-1.5 w-14 rounded-full bg-linear-to-r from-primary to-brand-deep' />
      <span className='size-1.5 rounded-full bg-primary/60' />
      <span className='size-1.5 rounded-full bg-primary/30' />
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <Reveal className='mx-auto max-w-2xl text-center'>
      {eyebrow && <span className='text-xs font-bold tracking-[0.18em] text-primary uppercase'>{eyebrow}</span>}
      <h2 className='mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl'>{title}</h2>
      {subtitle && <p className='mt-4 text-pretty text-muted-foreground sm:text-lg'>{subtitle}</p>}
    </Reveal>
  );
}

function CheckBullet() {
  return (
    <span className='grid size-5 shrink-0 place-items-center rounded-full bg-primary/12 text-primary'>
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
          <LanguageSelector />
          <LinkButton href={START_PATH} size='sm' className={BRAND_BUTTON_CLASS}>{t('landing_nav_start')}</LinkButton>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const { t } = useTranslation();

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section data-section='hero' className='relative isolate overflow-hidden'>
      <SoftGlowBackdrop />
      <div className={cn(LANDING_WIDTH_CLASS, 'grid items-center gap-14 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24 lg:pb-28')}>
        {/* min-w-0 lets this column shrink below its longest word, so long words wrap instead of overflowing */}
        <Reveal className='min-w-0'>
          <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-xs'>
            <SparklesIcon className='size-3.5 text-primary' />
            {t('landing_hero_eyebrow')}
          </span>
          <h1 className='mt-6 font-heading text-[clamp(2.25rem,11vw,3rem)] leading-[1.06] font-bold tracking-[-0.035em] break-words hyphens-auto uppercase sm:text-6xl xl:text-7xl'>
            <span className='block'>{t('landing_hero_title_lead')}</span>
            <span className={cn('block', BRAND_TEXT_CLASS)}>{t('landing_hero_title_build')}</span>
            <span className='block'>{t('landing_hero_title_rest')}</span>
          </h1>
          <HeadlineAccent className='mt-6' />
          <p className='mt-6 max-w-xl text-lg text-pretty text-muted-foreground'>{t('landing_hero_subtitle')}</p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <LinkButton href={START_PATH} size='lg' className={BRAND_BUTTON_CLASS}>
              {t('landing_cta_start')}
              <ArrowRightIcon data-icon='inline-end' />
            </LinkButton>
            <Button size='lg' variant='outline' className='bg-card' onClick={scrollToHowItWorks}>
              {t('landing_cta_how')}
            </Button>
          </div>
          <ul className='mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium'>
            {HERO_PERK_KEYS.map(perkKey => (
              <li key={perkKey} className='flex items-center gap-1.5'>
                <CheckBullet />
                {t(perkKey)}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delayMs={150}>
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  );
}

function BusinessesStrip() {
  const { t } = useTranslation();

  return (
    <section data-section='businesses' className='border-y bg-card'>
      <Reveal className={cn(LANDING_WIDTH_CLASS, 'py-10')}>
        <p className='text-center text-sm font-semibold text-muted-foreground'>{t('landing_made_for_title')}</p>
        <ul className='mt-5 flex flex-wrap justify-center gap-2.5'>
          {BUSINESSES.map(business => (
            <li key={business.id} data-businessid={business.id} className='flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-sm font-medium'>
              <business.Icon className='size-4 text-primary' strokeWidth={1.75} />
              {t(business.labelKey)}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

// Small UI vignettes heading each "how it works" step.
function StepTalkVisual() {
  return <ChatPreviewCard className='w-[300px] shrink-0 scale-[0.72] shadow-lg' />;
}

function StepBuildVisual() {
  return (
    <div className='w-52 overflow-hidden rounded-xl border bg-card shadow-lg'>
      <div className='border-b px-2.5 py-2'><BrowserDots /></div>
      <div className='flex flex-col gap-2 p-3'>
        <div className='h-10 rounded-lg bg-linear-to-r from-brand-light/50 to-primary/40' />
        <div className='grid grid-cols-3 gap-2'>
          {[0, 1, 2].map(index => <div key={index} className='h-8 rounded-md bg-muted' />)}
        </div>
        <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
          <div className='h-full w-3/4 rounded-full bg-linear-to-r from-primary to-brand-deep' />
        </div>
      </div>
    </div>
  );
}

function StepLiveVisual() {
  const { t } = useTranslation();
  return (
    <div className='flex flex-col items-center gap-3'>
      <span className='flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-semibold shadow-lg'>
        <LockIcon className='size-4 text-success' />
        {t('landing_example_domain_moto')}
      </span>
      <span className='flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success'>
        <span className='size-1.5 rounded-full bg-success' />
        {t('landing_scene_live')}
      </span>
    </div>
  );
}

const STEP_VISUALS: Record<string, () => React.ReactNode> = {
  talk: StepTalkVisual,
  build: StepBuildVisual,
  live: StepLiveVisual,
};

function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    // scroll-mt keeps the heading clear of the sticky header when the hero button scrolls here.
    <section id='how-it-works' data-section='how-it-works' className={cn(LANDING_WIDTH_CLASS, 'scroll-mt-16 py-20 sm:py-28')}>
      <SectionHeading eyebrow={t('landing_how_eyebrow')} title={t('landing_how_title')} />
      <ol className='mt-12 grid gap-5 md:grid-cols-3'>
        {STEPS.map((step, index) => {
          const StepVisual = STEP_VISUALS[step.id];
          return (
            <Reveal as='li' key={step.id} delayMs={index * STAGGER_MS} data-stepid={step.id} className='flex flex-col rounded-3xl border bg-card p-6 shadow-xs'>
              <div className='grid h-52 place-items-center overflow-hidden rounded-2xl bg-linear-to-br from-accent to-highlight'>
                <StepVisual />
              </div>
              <span className='mt-6 font-heading text-sm font-bold text-primary'>{`0${index + 1}`}</span>
              <h3 className='mt-1 font-heading text-xl font-bold tracking-[-0.02em]'>{t(step.titleKey)}</h3>
              <p className='mt-2 text-muted-foreground'>{t(step.descKey)}</p>
            </Reveal>
          );
        })}
      </ol>
    </section>
  );
}

// Original purpose: "why us" — the concrete perks of a site built here (custom UI/UX, SEO, speed,
// responsive): a laptop with an example site next to a column of checked-off cards, then a closing nudge.
function AdvantagesSection() {
  const { t } = useTranslation();

  return (
    <section data-section='advantages' className='relative isolate overflow-hidden border-y bg-card'>
      <SoftGlowBackdrop />
      <div className={cn(LANDING_WIDTH_CLASS, 'py-20 sm:py-28')}>
        <Reveal>
          <span className='text-xs font-bold tracking-[0.18em] text-primary uppercase'>{t('landing_adv_eyebrow', { appName: APP_NAME })}</span>
          <h2 className='mt-3 max-w-3xl font-heading text-[clamp(2rem,9.5vw,2.25rem)] leading-[1.04] font-bold tracking-[-0.035em] break-words hyphens-auto uppercase sm:text-6xl'>
            {t('landing_adv_title_lead')}{' '}
            <span className={BRAND_TEXT_CLASS}>{t('landing_adv_title_highlight')}</span>
          </h2>
          <HeadlineAccent className='mt-6' />
        </Reveal>

        <div className='mt-10 grid items-center gap-10 lg:grid-cols-[1fr_320px] lg:gap-12'>
          <Reveal>
            <LaptopShowcase />
          </Reveal>
          <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-1'>
            {ADVANTAGES.map((advantage, index) => (
              <Reveal as='li' key={advantage.id} delayMs={index * STAGGER_MS} data-advantageid={advantage.id} className='relative flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-lg shadow-primary/5'>
                <span className='absolute -top-2 -left-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30'>
                  <CheckIcon className='size-3.5' strokeWidth={3} />
                </span>
                <span className='grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary'>
                  <advantage.Icon className='size-6' strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className='font-heading font-bold'>{t(advantage.titleKey)}</h3>
                  <p className='mt-0.5 text-sm text-muted-foreground'>{t(advantage.descKey)}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className='mt-16 text-center'>
          <p className='font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl'>
            {t('landing_adv_cta_lead')}{' '}
            <span className={BRAND_TEXT_CLASS}>{t('landing_adv_cta_highlight')}</span>
          </p>
          <LinkButton href={START_PATH} size='lg' className={cn(BRAND_BUTTON_CLASS, 'mt-7 rounded-full px-7')}>
            {t('landing_cta_start')}
            <ArrowRightIcon data-icon='inline-end' />
          </LinkButton>
          <ul className='mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground sm:divide-x'>
            {ADVANTAGE_TICK_KEYS.map(tickKey => (
              <li key={tickKey} className='flex items-center gap-1.5 sm:pr-6 sm:last:pr-0'>
                <CheckBullet />
                {t(tickKey)}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function DealSection() {
  const { t } = useTranslation();

  return (
    <section data-section='deal' className={cn(LANDING_WIDTH_CLASS, 'py-20 sm:py-28')}>
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
        <Reveal delayMs={STAGGER_MS} className='rounded-3xl bg-linear-to-br from-primary to-brand-deep p-6 text-primary-foreground shadow-xl shadow-primary/20 sm:p-8 lg:col-span-3'>
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
    <section data-section='showcase' className='border-y bg-card'>
      <div className={cn(LANDING_WIDTH_CLASS, 'py-20 sm:py-28')}>
        <SectionHeading eyebrow={t('landing_showcase_eyebrow')} title={t('landing_showcase_title')} subtitle={t('landing_showcase_subtitle')} />
        <ul className='mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {SHOWCASE_SITES.map((site, index) => (
            // Staggered within each row of three; the next row starts its own wave as it scrolls in.
            <Reveal as='li' key={site.id} delayMs={(index % 3) * STAGGER_MS} data-siteid={site.id} className='overflow-hidden rounded-2xl border bg-background shadow-xs transition-shadow hover:shadow-lg hover:shadow-primary/10'>
              <div className='flex items-center gap-3 border-b bg-card px-3 py-2'>
                <BrowserDots />
                <span className='truncate rounded-md bg-muted px-2 py-0.5 text-[0.6875rem] text-muted-foreground'>{t(site.domainKey)}</span>
              </div>
              <ScaledFrame baseWidth={640} baseHeight={400}>
                <site.Site />
              </ScaledFrame>
              <div className='p-5'>
                <p className='text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase'>{t(site.typeKey)}</p>
                <p className='mt-1.5 font-medium'>{t(site.descKey)}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CompareSection() {
  const { t } = useTranslation();

  return (
    <section data-section='compare' className={cn(LANDING_WIDTH_CLASS, 'py-20 sm:py-28')}>
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
            <CheckIcon className='mt-0.5 size-4 shrink-0 text-primary' strokeWidth={3} />
            {t(row.vib3Key)}
          </div>,
        ])}
      </Reveal>
    </section>
  );
}

function FaqSection() {
  const { t } = useTranslation();

  return (
    <section data-section='faq' className={cn(LANDING_WIDTH_CLASS, 'pb-20 sm:pb-28')}>
      <SectionHeading title={t('landing_faq_title')} />
      <Reveal className='mx-auto mt-10 flex max-w-3xl flex-col gap-3'>
        {FAQS.map(faq => (
          // Native <details>: open/close for free, no JS state, and it works with the keyboard.
          <details key={faq.id} data-faqid={faq.id} className='group rounded-2xl border bg-card px-5 py-4 open:shadow-sm'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-4 font-heading font-semibold [&::-webkit-details-marker]:hidden'>
              {t(faq.questionKey)}
              <ChevronDownIcon className='size-4 shrink-0 text-primary transition-transform group-open:rotate-180' />
            </summary>
            <p className='mt-3 text-muted-foreground'>{t(faq.answerKey)}</p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}

function FinalCta() {
  const { t } = useTranslation();

  return (
    <section data-section='final-cta' className={cn(LANDING_WIDTH_CLASS, 'pb-16')}>
      <Reveal className='relative isolate overflow-hidden rounded-3xl bg-linear-to-br from-primary to-brand-deep px-6 py-12 text-center text-primary-foreground shadow-xl shadow-primary/25 sm:px-12 sm:py-14'>
        <div aria-hidden='true' className='pointer-events-none absolute -top-40 -right-40 -z-10 grid size-[480px] place-items-center'>
          {['size-[260px]', 'size-[370px]', 'size-[480px]'].map(sizeClass => (
            <span key={sizeClass} className={cn('absolute rounded-full border border-primary-foreground/15', sizeClass)} />
          ))}
        </div>
        <h2 className='mx-auto max-w-2xl font-heading text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl'>{t('landing_final_title')}</h2>
        <p className='mx-auto mt-3 max-w-xl opacity-85 sm:text-lg'>{t('landing_final_subtitle')}</p>
        <LinkButton href={START_PATH} size='lg' className='mt-7 rounded-full bg-primary-foreground px-7 text-primary hover:bg-primary-foreground/90'>
          {t('landing_cta_start')}
          <ArrowRightIcon data-icon='inline-end' />
        </LinkButton>
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
          <Link to={PATHS.privacyPolicy} className='hover:text-foreground'>{t('landing_footer_privacy')}</Link>
          <Link to={PATHS.cookiePolicy} className='hover:text-foreground'>{t('cookie_policy_title')}</Link>
        </div>
      </div>
    </footer>
  );
}

// Original purpose: the public front door at `/` for visitors who aren't signed in.
// Intentions: sells one idea — you just talk, we do the building, hosting, domain and launch — in a clean,
// product-style layout: hero, how it works, why us (laptop + advantages), who does what, examples, FAQ.
// Pinned to the light theme (`force-light`) whatever the app theme is.
export default function Landing() {
  return (
    <div data-page='landing' className='force-light min-h-svh bg-background text-foreground'>
      <LandingHeader />
      <main>
        <HeroSection />
        <BusinessesStrip />
        <HowItWorksSection />
        <AdvantagesSection />
        <DealSection />
        <ShowcaseSection />
        <CompareSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
