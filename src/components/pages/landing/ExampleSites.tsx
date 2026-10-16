import { useTranslation } from 'react-i18next';
import {
  BedDoubleIcon, CalendarIcon, CoffeeIcon, HeartIcon, HouseIcon, MapPinIcon, MotorbikeIcon, SearchIcon,
  ShirtIcon, ShoppingBagIcon, StarIcon, UsersIcon, WavesIcon,
} from 'lucide-react';
import { cn } from 'cn';

import PerfumeBottleIcon from 'src/components/pages/landing/PerfumeBottleIcon';

// Intentions: the made-up customer sites shown in the landing page's "Ideas" section. Each one is a
// small but believable home page with its own layout and brand colors (the `--site-*` tokens), so the
// grid reads like a portfolio of different real sites rather than one template repeated. They're all
// drawn on a 640x400 canvas; the caller scales them down with ScaledFrame.
// Shop names, product names and prices are flavor and stay as-is in every language.

// Standard top bar: brand on the left, a few links and a call-to-action on the right.
function SiteNav({ brand, brandClassName, linkKeys, ctaLabel, ctaClassName, className }: {
  brand: React.ReactNode;
  brandClassName?: string;
  linkKeys: string[];
  ctaLabel?: string;
  ctaClassName?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center justify-between px-7 py-4', className)}>
      <span className={cn('flex items-center gap-2 text-[15px] font-bold', brandClassName)}>{brand}</span>
      <div className='flex items-center gap-5 text-[11px] font-medium opacity-80'>
        {linkKeys.map(linkKey => <span key={linkKey}>{t(linkKey)}</span>)}
        {ctaLabel && <span className={cn('rounded-full px-3.5 py-1.5 text-[11px] font-semibold opacity-100', ctaClassName)}>{ctaLabel}</span>}
      </div>
    </div>
  );
}

function MotoRentalSite() {
  const { t } = useTranslation();
  const bikes = [
    { id: 'vision', name: 'Vision', price: '120k' },
    { id: 'airblade', name: 'Air Blade', price: '150k' },
    { id: 'wave', name: 'Wave', price: '100k' },
  ];
  return (
    <div className='flex size-full flex-col bg-card text-foreground'>
      <SiteNav
        brand={<><MotorbikeIcon className='size-5 text-site-moto' />Da Nang Moto</>}
        linkKeys={['landing_laptop_nav_bikes', 'landing_laptop_nav_prices', 'landing_laptop_nav_contact']}
        ctaLabel={t('landing_laptop_nav_cta')}
        ctaClassName='bg-site-moto text-card'
      />
      <div className='grid flex-1 grid-cols-[1fr_1.05fr] gap-6 px-7'>
        <div className='pt-4'>
          <span className='text-[11px] font-semibold text-site-moto'>{t('landing_mock_moto_from')}</span>
          <p className='mt-2 font-heading text-[34px] leading-[1.02] font-bold tracking-tight'>{t('landing_mock_moto_title')}</p>
          <p className='mt-3 text-[12px] leading-relaxed text-muted-foreground'>{t('landing_laptop_subtitle')}</p>
          <div className='mt-4 flex items-center gap-1 text-[11px] text-muted-foreground'>
            <StarIcon className='size-3 fill-site-moto text-site-moto' />4.9 · {t('landing_mock_reviews')}
          </div>
        </div>
        <div className='relative'>
          {/* "Photo": a sunset road */}
          <div className='relative h-[200px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_75%_30%,var(--site-moto-soft),var(--site-moto)_70%)]'>
            <div className='absolute inset-x-0 bottom-0 h-16 bg-site-hotel/80' />
            <MotorbikeIcon className='absolute bottom-6 left-1/2 size-28 -translate-x-1/2 text-card' strokeWidth={1.25} />
          </div>
          <div className='absolute inset-x-4 -bottom-10 rounded-xl border bg-card p-3 shadow-lg'>
            <div className='grid grid-cols-2 gap-2 text-[10px]'>
              {['landing_laptop_pickup', 'landing_laptop_return'].map(fieldKey => (
                <div key={fieldKey} className='rounded-lg border px-2.5 py-1.5'>
                  <p className='text-muted-foreground'>{t(fieldKey)}</p>
                  <p className='flex items-center gap-1 font-semibold'><CalendarIcon className='size-3' />12/06</p>
                </div>
              ))}
            </div>
            <span className='mt-2 block rounded-lg bg-site-moto py-1.5 text-center text-[11px] font-semibold text-card'>{t('landing_laptop_find')}</span>
          </div>
        </div>
      </div>
      <div className='grid grid-cols-3 gap-3 px-7 pt-14 pb-5'>
        {bikes.map(bike => (
          <div key={bike.id} className='flex items-center gap-2.5 rounded-xl border p-2.5'>
            <span className='grid size-9 place-items-center rounded-lg bg-site-moto-soft'><MotorbikeIcon className='size-4.5 text-site-moto' /></span>
            <div className='text-[11px]'>
              <p className='font-semibold'>{bike.name}</p>
              <p className='text-muted-foreground'>{bike.price}{t('landing_laptop_per_day')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LakeHouseSite() {
  const { t } = useTranslation();
  // A week of the availability calendar; `isBooked` days get struck through.
  const days = [
    { id: 'mon', date: 12, isBooked: false },
    { id: 'tue', date: 13, isBooked: true },
    { id: 'wed', date: 14, isBooked: true },
    { id: 'thu', date: 15, isBooked: false },
    { id: 'fri', date: 16, isBooked: false },
    { id: 'sat', date: 17, isBooked: true },
    { id: 'sun', date: 18, isBooked: false },
  ];
  return (
    <div className='flex size-full flex-col bg-site-home-soft text-foreground'>
      {/* Full-bleed "photo" hero: dusk sky over the lake, with the nav and title on top */}
      <div className='relative h-[230px] overflow-hidden bg-[linear-gradient(to_bottom,var(--site-home-soft),var(--site-home)_75%)] text-card'>
        <div className='absolute inset-x-0 bottom-0 h-20 bg-site-home' />
        <WavesIcon className='absolute bottom-3 left-[42%] size-14 text-card/40' />
        <HouseIcon className='absolute right-16 bottom-14 size-24 text-card/85' strokeWidth={1.25} />
        <SiteNav
          brand={<span className='tracking-wide text-site-home'>Little Lake House</span>}
          linkKeys={['landing_mock_nav_rooms', 'landing_mock_nav_gallery', 'landing_laptop_nav_contact']}
          className='relative text-site-home'
        />
        <div className='relative px-7 pt-6'>
          <p className='max-w-[300px] font-heading text-[30px] leading-[1.05] font-bold'>{t('landing_mock_home_title')}</p>
          <p className='mt-2 flex items-center gap-1 text-[11px] opacity-90'><MapPinIcon className='size-3' />Đà Lạt</p>
        </div>
      </div>
      <div className='flex flex-1 items-center gap-5 px-7'>
        <div className='flex-1'>
          <p className='text-[11px] font-semibold text-site-home'>{t('landing_mock_home_available')}</p>
          <div className='mt-2 grid grid-cols-7 gap-1.5'>
            {days.map(day => (
              <span
                key={day.id}
                className={cn(
                  'grid h-9 place-items-center rounded-lg text-[12px] font-semibold',
                  day.isBooked ? 'bg-card/60 text-muted-foreground line-through' : 'bg-card text-site-home shadow-sm',
                )}
              >
                {day.date}
              </span>
            ))}
          </div>
        </div>
        <div className='rounded-xl bg-card p-3 text-center shadow-sm'>
          <p className='font-heading text-[18px] font-bold'>850k<span className='text-[11px] font-normal text-muted-foreground'>{t('landing_mock_per_night')}</span></p>
          <span className='mt-1.5 block rounded-full bg-site-home px-3 py-1.5 text-[11px] font-semibold text-card'>{t('landing_mock_home_cta')}</span>
        </div>
      </div>
    </div>
  );
}

function HotelSite() {
  const { t } = useTranslation();
  const rooms = [
    { id: 'deluxe', nameKey: 'landing_mock_room_deluxe', price: '1.2M' },
    { id: 'suite', nameKey: 'landing_mock_room_suite', price: '2.4M' },
    { id: 'family', nameKey: 'landing_mock_room_family', price: '1.8M' },
  ];
  return (
    <div className='flex size-full flex-col bg-site-hotel text-card'>
      <SiteNav
        brand={<span className='tracking-[0.3em] text-site-hotel-gold'>HOTEL SEN</span>}
        linkKeys={['landing_mock_nav_rooms', 'landing_mock_nav_gallery', 'landing_laptop_nav_contact']}
        ctaLabel={t('landing_laptop_nav_cta')}
        ctaClassName='border border-site-hotel-gold text-site-hotel-gold'
      />
      <div className='px-7 pt-5 text-center'>
        <p className='text-[11px] tracking-[0.25em] text-site-hotel-gold uppercase'>★★★★★</p>
        <p className='mt-2 font-heading text-[30px] leading-tight font-bold'>{t('landing_mock_hotel_title')}</p>
      </div>
      <div className='mx-7 mt-5 grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 rounded-xl bg-card p-2 text-[10px] text-site-hotel'>
        {[
          { id: 'in', labelKey: 'landing_mock_checkin', value: '12/06', Icon: CalendarIcon },
          { id: 'out', labelKey: 'landing_mock_checkout', value: '14/06', Icon: CalendarIcon },
          { id: 'guests', labelKey: 'landing_mock_guests', value: '2', Icon: UsersIcon },
        ].map(field => (
          <div key={field.id} className='flex items-center gap-1.5 border-r px-2 last-of-type:border-r-0'>
            <field.Icon className='size-3.5 opacity-60' />
            <div>
              <p className='opacity-60'>{t(field.labelKey)}</p>
              <p className='font-semibold'>{field.value}</p>
            </div>
          </div>
        ))}
        <span className='flex items-center gap-1 rounded-lg bg-site-hotel-gold px-3 py-2 font-semibold text-site-hotel'><SearchIcon className='size-3' />{t('landing_mock_search')}</span>
      </div>
      <div className='mt-auto grid grid-cols-3 gap-3 px-7 pb-6'>
        {rooms.map(room => (
          <div key={room.id} className='overflow-hidden rounded-xl bg-card/8 ring-1 ring-card/10'>
            <div className='grid h-16 place-items-center bg-[linear-gradient(135deg,var(--site-hotel-gold),transparent)] opacity-90'>
              <BedDoubleIcon className='size-7 text-card' strokeWidth={1.5} />
            </div>
            <div className='flex items-center justify-between p-2.5 text-[11px]'>
              <span className='font-semibold'>{t(room.nameKey)}</span>
              <span className='text-site-hotel-gold'>{room.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoutiqueSite() {
  const { t } = useTranslation();
  const products = [
    { id: 'linen', nameKey: 'landing_mock_product_linen', price: '450k', swatches: ['bg-site-boutique-soft', 'bg-site-cafe', 'bg-site-hotel'] },
    { id: 'tee', nameKey: 'landing_mock_product_tee', price: '220k', swatches: ['bg-card', 'bg-site-boutique', 'bg-site-home'] },
    { id: 'dress', nameKey: 'landing_mock_product_dress', price: '590k', swatches: ['bg-site-boutique', 'bg-site-moto-soft'] },
    { id: 'denim', nameKey: 'landing_mock_product_denim', price: '680k', swatches: ['bg-site-hotel', 'bg-site-home'] },
  ];
  const tints = ['bg-site-boutique-soft', 'bg-site-cafe-soft', 'bg-site-moto-soft', 'bg-site-home-soft'];
  return (
    <div className='flex size-full flex-col bg-card text-foreground'>
      <SiteNav
        brand={<span className='font-heading text-[17px] tracking-tight'>Thread <span className='text-site-boutique'>&amp;</span> Co.</span>}
        linkKeys={['landing_mock_tab_new', 'landing_mock_tab_women', 'landing_mock_tab_men']}
        className='border-b'
      />
      <div className='flex items-center justify-between px-7 pt-4'>
        <p className='font-heading text-[20px] font-bold'>{t('landing_mock_boutique_title')}</p>
        <span className='flex items-center gap-1 rounded-full bg-site-boutique px-3 py-1 text-[11px] font-semibold text-card'>
          <ShoppingBagIcon className='size-3' />2
        </span>
      </div>
      <div className='grid flex-1 grid-cols-4 gap-3 px-7 pt-3 pb-5'>
        {products.map((product, index) => (
          <div key={product.id} className='flex flex-col'>
            <div className={cn('relative grid flex-1 place-items-center rounded-xl', tints[index])}>
              <ShirtIcon className='size-14 text-site-boutique/80' strokeWidth={1.25} />
              <HeartIcon className='absolute top-2 right-2 size-3.5 text-site-boutique' />
            </div>
            <p className='mt-2 text-[11px] font-semibold'>{t(product.nameKey)}</p>
            <div className='mt-1 flex items-center justify-between'>
              <span className='text-[11px] text-muted-foreground'>{product.price}</span>
              <span className='flex gap-1'>
                {product.swatches.map(swatch => <span key={swatch} className={cn('size-2.5 rounded-full ring-1 ring-border', swatch)} />)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerfumeSite() {
  const { t } = useTranslation();
  const moodKeys = ['landing_mock_mood_fresh', 'landing_mock_mood_floral', 'landing_mock_mood_woody', 'landing_mock_mood_sweet'];
  const scents = [
    { id: 'sen', name: 'Sen Trắng', price: '890k' },
    { id: 'tram', name: 'Gỗ Trầm', price: '1.1M' },
    { id: 'su', name: 'Hoa Sứ', price: '950k' },
  ];
  return (
    <div className='flex size-full flex-col items-center bg-site-perfume-soft text-site-perfume'>
      <p className='pt-5 text-[13px] font-semibold tracking-[0.4em]'>HƯƠNG</p>
      <div className='mt-1 h-px w-16 bg-site-perfume/30' />
      <p className='mt-5 font-heading text-[30px] font-bold tracking-tight'>{t('landing_mock_perfume_title')}</p>
      <div className='mt-3 flex gap-2'>
        {moodKeys.map((moodKey, index) => (
          <span
            key={moodKey}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium',
              index === 1 ? 'bg-site-perfume text-card' : 'border border-site-perfume/25',
            )}
          >
            {t(moodKey)}
          </span>
        ))}
      </div>
      <div className='mt-6 grid w-full grid-cols-3 gap-4 px-10'>
        {scents.map(scent => (
          <div key={scent.id} className='flex flex-col items-center rounded-2xl bg-card/70 pt-4 pb-3 shadow-sm'>
            <PerfumeBottleIcon className='size-14' strokeWidth={1.25} />
            <p className='mt-2 text-[12px] font-semibold'>{scent.name}</p>
            <p className='text-[11px] opacity-70'>{scent.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CafeSite() {
  const { t } = useTranslation();
  const menu = [
    { id: 'espresso', name: 'Espresso', price: '35k' },
    { id: 'suada', name: 'Cà phê sữa đá', price: '39k' },
    { id: 'coldbrew', name: 'Cold brew', price: '45k' },
    { id: 'croissant', name: 'Croissant', price: '32k' },
  ];
  return (
    <div className='flex size-full flex-col bg-site-cafe-soft text-site-cafe'>
      <SiteNav
        brand={<><CoffeeIcon className='size-5' />Morning Bean</>}
        linkKeys={['landing_mock_nav_menu', 'landing_laptop_nav_contact']}
        ctaLabel={t('landing_mock_cafe_reserve_title')}
        ctaClassName='bg-site-cafe text-card'
      />
      <p className='px-7 pt-2 font-heading text-[28px] leading-tight font-bold'>{t('landing_mock_cafe_title')}</p>
      <div className='grid flex-1 grid-cols-[1.2fr_1fr] gap-6 px-7 pt-4 pb-6'>
        <div>
          <p className='text-[11px] font-bold tracking-[0.2em] uppercase opacity-70'>{t('landing_mock_cafe_menu')}</p>
          <ul className='mt-2 flex flex-col gap-2.5 text-[12px]'>
            {menu.map(item => (
              <li key={item.id} className='flex items-end gap-2'>
                <span className='font-medium'>{item.name}</span>
                <span className='mb-1 flex-1 border-b border-dotted border-site-cafe/40' />
                <span className='font-semibold'>{item.price}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className='rounded-2xl bg-card p-4 shadow-sm'>
          <p className='text-[13px] font-bold'>{t('landing_mock_cafe_reserve_title')}</p>
          <div className='mt-2.5 flex flex-col gap-1.5 text-[11px]'>
            {[
              { id: 'date', labelKey: 'landing_mock_date', value: '12/06' },
              { id: 'time', labelKey: 'landing_mock_time', value: '08:30' },
              { id: 'guests', labelKey: 'landing_mock_guests', value: '2' },
            ].map(field => (
              <div key={field.id} className='flex justify-between rounded-lg border border-site-cafe/15 px-2.5 py-1.5'>
                <span className='opacity-70'>{t(field.labelKey)}</span>
                <span className='font-semibold'>{field.value}</span>
              </div>
            ))}
          </div>
          <span className='mt-2.5 block rounded-lg bg-site-cafe py-1.5 text-center text-[11px] font-semibold text-card'>{t('landing_mock_cafe_reserve')}</span>
        </div>
      </div>
    </div>
  );
}

export {
  MotoRentalSite,
  LakeHouseSite,
  HotelSite,
  BoutiqueSite,
  PerfumeSite,
  CafeSite,
};
