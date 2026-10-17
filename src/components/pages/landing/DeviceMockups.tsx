import { useTranslation } from 'react-i18next';
import { CalendarIcon, MotorbikeIcon, SearchIcon, StarIcon, ZapIcon } from 'lucide-react';
import { cn } from 'cn';

import ScaledFrame from 'src/components/common/ScaledFrame';

// Made-up listings for the example site. Bike models and prices are just flavor.
const EXAMPLE_BIKES = [
  { id: 'vision', name: 'Vision', price: '120k' },
  { id: 'airblade', name: 'Air Blade', price: '150k' },
  { id: 'wave', name: 'Wave', price: '100k' },
];

const EXAMPLE_NAV_KEYS = ['landing_laptop_nav_bikes', 'landing_laptop_nav_prices', 'landing_laptop_nav_contact'];

// Shared look of the little cards floating around the laptop.
const FLOATING_CARD_CLASS = 'rounded-2xl border bg-card/95 p-3.5 shadow-xl shadow-primary/10 backdrop-blur';

// The example site on the laptop screen: a polished bike-rental home page (nav, hero with a booking
// widget, and a row of bikes). Laid out on a fixed 800x500 canvas; ScaledFrame shrinks it to fit.
function ExampleSiteDesktop() {
  const { t } = useTranslation();

  return (
    <div className='flex size-full flex-col bg-card text-foreground'>
      <div className='flex items-center justify-between border-b px-8 py-4'>
        <span className='flex items-center gap-2 font-heading text-[15px] font-bold'>
          <span className='grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground'>
            <MotorbikeIcon className='size-4' />
          </span>
          {t('landing_laptop_site_name')}
        </span>
        <div className='flex items-center gap-6 text-[12px] text-muted-foreground'>
          {EXAMPLE_NAV_KEYS.map(navKey => <span key={navKey}>{t(navKey)}</span>)}
          <span className='rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground'>{t('landing_laptop_nav_cta')}</span>
        </div>
      </div>

      <div className='grid grid-cols-[1.1fr_1fr] gap-8 px-8 pt-7'>
        <div>
          <span className='rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground'>{t('landing_laptop_badge')}</span>
          <p className='mt-4 font-heading text-[34px] leading-[1.05] font-bold tracking-tight'>
            {t('landing_laptop_heading_1')} <span className='text-brand-strong'>{t('landing_laptop_heading_2')}</span>
          </p>
          <p className='mt-3 text-[13px] leading-relaxed text-muted-foreground'>{t('landing_laptop_subtitle')}</p>
          <div className='mt-5 flex gap-2 text-[12px] font-semibold'>
            <span className='rounded-full bg-primary px-4 py-2 text-primary-foreground'>{t('landing_laptop_cta')}</span>
            <span className='rounded-full border px-4 py-2'>{t('landing_laptop_secondary_cta')}</span>
          </div>
          <div className='mt-5 flex items-center gap-2 text-[11px] text-muted-foreground'>
            <span className='flex text-brand-strong'>
              {[0, 1, 2, 3, 4].map(index => <StarIcon key={index} className='size-3 fill-current' />)}
            </span>
            {t('landing_laptop_rating')}
          </div>
        </div>
        <div className='relative'>
          <div className='grid h-[200px] place-items-center rounded-2xl bg-linear-to-br from-brand-light/45 via-primary/25 to-brand-deep/40'>
            <MotorbikeIcon className='size-24 text-brand-strong' strokeWidth={1.25} />
          </div>
          <div className='absolute inset-x-5 -bottom-8 rounded-xl border bg-card p-3 shadow-lg'>
            <div className='grid grid-cols-2 gap-2 text-[10px]'>
              {['landing_laptop_pickup', 'landing_laptop_return'].map(fieldKey => (
                <div key={fieldKey} className='rounded-lg border px-2.5 py-1.5'>
                  <p className='text-muted-foreground'>{t(fieldKey)}</p>
                  <p className='flex items-center gap-1 font-semibold'><CalendarIcon className='size-3' />12/06</p>
                </div>
              ))}
            </div>
            <span className='mt-2 block rounded-lg bg-primary py-1.5 text-center text-[11px] font-semibold text-primary-foreground'>{t('landing_laptop_find')}</span>
          </div>
        </div>
      </div>

      <div className='mt-auto grid grid-cols-3 gap-4 px-8 pb-6'>
        {EXAMPLE_BIKES.map(bike => (
          <div key={bike.id} data-bikeid={bike.id} className='flex items-center gap-3 rounded-xl border p-3'>
            <span className='grid size-11 place-items-center rounded-lg bg-accent'>
              <MotorbikeIcon className='size-5 text-brand-strong' />
            </span>
            <div className='flex-1'>
              <p className='text-[12px] font-semibold'>{bike.name}</p>
              <p className='text-[11px] text-muted-foreground'>{bike.price}{t('landing_laptop_per_day')}</p>
            </div>
            <span className='rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-brand-strong'>{t('landing_laptop_nav_cta')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// The same example site, phone-sized (260x540 canvas): stacked hero, picture and one bike card.
function ExampleSiteMobile() {
  const { t } = useTranslation();

  return (
    <div className='flex size-full flex-col gap-4 bg-card p-4 text-foreground'>
      <div className='flex items-center justify-between'>
        <span className='grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground'>
          <MotorbikeIcon className='size-4' />
        </span>
        <span className='flex flex-col gap-1'>
          {[0, 1, 2].map(index => <span key={index} className='h-0.5 w-4 rounded bg-foreground' />)}
        </span>
      </div>
      <p className='font-heading text-[24px] leading-[1.1] font-bold'>
        {t('landing_laptop_heading_1')} <span className='text-brand-strong'>{t('landing_laptop_heading_2')}</span>
      </p>
      <div className='grid h-32 place-items-center rounded-2xl bg-linear-to-br from-brand-light/45 via-primary/25 to-brand-deep/40'>
        <MotorbikeIcon className='size-16 text-brand-strong' strokeWidth={1.25} />
      </div>
      <span className='rounded-full bg-primary py-2.5 text-center text-[13px] font-semibold text-primary-foreground'>{t('landing_laptop_cta')}</span>
      <div className='flex items-center gap-3 rounded-xl border p-3'>
        <span className='grid size-10 place-items-center rounded-lg bg-accent'>
          <MotorbikeIcon className='size-5 text-brand-strong' />
        </span>
        <div>
          <p className='text-[13px] font-semibold'>{EXAMPLE_BIKES[0].name}</p>
          <p className='text-[12px] text-muted-foreground'>{EXAMPLE_BIKES[0].price}{t('landing_laptop_per_day')}</p>
        </div>
      </div>
    </div>
  );
}

function PhoneMockup({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[1.4rem] bg-foreground p-1.5 shadow-2xl shadow-primary/20', className)}>
      <div className='overflow-hidden rounded-[1.1rem]'>
        <ScaledFrame baseWidth={260} baseHeight={540}>
          <ExampleSiteMobile />
        </ScaledFrame>
      </div>
    </div>
  );
}

// "Lightning fast": a perfect performance score.
function SpeedScoreCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn(FLOATING_CARD_CLASS, 'flex items-center gap-3', className)}>
      <span className='grid size-12 place-items-center rounded-full bg-[conic-gradient(var(--brand-strong)_0_100%)] p-1'>
        <span className='grid size-full place-items-center rounded-full bg-card font-heading text-sm font-bold text-brand-strong'>100</span>
      </span>
      <div>
        <p className='flex items-center gap-1 text-sm font-semibold'><ZapIcon className='size-3.5 fill-brand-strong text-brand-strong' />{t('landing_laptop_speed_title')}</p>
        <p className='text-xs text-muted-foreground'>{t('landing_laptop_speed_label')}</p>
      </div>
    </div>
  );
}

// "Grows your business": bookings trending up.
function BookingsChartCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn(FLOATING_CARD_CLASS, className)}>
      <p className='text-xs font-medium text-muted-foreground'>{t('landing_laptop_bookings_title')}</p>
      <p className='mt-0.5 font-heading text-xl font-bold'>+38%</p>
      <svg viewBox='0 0 200 64' className='mt-2 h-14 w-full' aria-hidden='true'>
        <defs>
          <linearGradient id='landing-bookings-area' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' style={{ stopColor: 'var(--brand-strong)', stopOpacity: 0.35 }} />
            <stop offset='1' style={{ stopColor: 'var(--brand-strong)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d='M0 56 L28 48 L56 52 L84 36 L112 40 L140 24 L168 26 L200 8 V64 H0 Z' fill='url(#landing-bookings-area)' />
        <path d='M0 56 L28 48 L56 52 L84 36 L112 40 L140 24 L168 26 L200 8' fill='none' stroke='var(--brand-strong)' strokeWidth={2.5} strokeLinejoin='round' strokeLinecap='round' />
      </svg>
    </div>
  );
}

// "SEO ready": the site ranking first for a local search.
function SearchResultCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn(FLOATING_CARD_CLASS, className)}>
      <div className='flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground'>
        <SearchIcon className='size-3.5' />
        {t('landing_laptop_search_query')}
      </div>
      <div className='mt-2.5 flex items-center gap-2 text-xs'>
        <span className='rounded-full bg-primary px-2 py-0.5 font-bold text-primary-foreground'>#1</span>
        <span className='text-success'>{t('landing_example_domain_moto')}</span>
      </div>
      <p className='mt-1 text-sm font-semibold text-brand-strong'>{t('landing_laptop_search_title')}</p>
    </div>
  );
}

// Original purpose: the landing page's advantages section (custom UI/UX, SEO, speed, responsive).
// Intentions: a laptop showing a finished example site, with cards floating around it that each back up
// one advantage — a perfect speed score, the phone version, a #1 search result and growing bookings.
function LaptopShowcase({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div role='img' aria-label={t('landing_laptop_alt')} className={cn('relative px-4 pt-14 pb-8 sm:px-10 sm:pt-16', className)}>
      {/* A slight turn, like a product shot */}
      <div style={{ transform: 'perspective(1800px) rotateY(-7deg) rotateX(4deg)' }}>
        <div className='rounded-t-[1.4rem] bg-foreground p-[2.2%] pb-[2.8%] shadow-2xl shadow-primary/25'>
          <div className='overflow-hidden rounded-md'>
            <ScaledFrame baseWidth={800} baseHeight={500}>
              <ExampleSiteDesktop />
            </ScaledFrame>
          </div>
        </div>
        <div className='relative -mx-[7%] h-3.5 rounded-b-2xl bg-linear-to-b from-border to-muted-foreground/50 shadow-lg sm:h-5'>
          <span className='absolute top-0 left-1/2 h-1.5 w-[15%] -translate-x-1/2 rounded-b-md bg-muted-foreground/30' />
        </div>
      </div>
      <div className='mx-[6%] mt-3 h-5 rounded-full bg-foreground/15 blur-xl' />

      <SpeedScoreCard className='absolute top-0 left-0 origin-top-left scale-75 sm:-left-2 sm:scale-100' />
      <PhoneMockup className='absolute top-[14%] right-0 w-[22%] max-w-36 sm:-right-2' />
      <BookingsChartCard className='absolute bottom-[16%] -left-2 hidden w-52 sm:block' />
      <SearchResultCard className='absolute right-[6%] -bottom-2 hidden w-64 sm:block' />
    </div>
  );
}

export {
  LaptopShowcase,
};
