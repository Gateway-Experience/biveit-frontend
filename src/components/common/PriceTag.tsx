import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { ZapIcon } from 'lucide-react';

import { getPriceLabels } from 'src/services/pricing';

// Intentions: the "Launch sale" flag beside the price, shaped like a real price tag (pointed end, a punched hole)
// in the brand lime, tilted a touch so it reads as stuck on. Says what the sale is worth too ("Save $10").
function SaleTag({ prices }: { prices: ReturnType<typeof getPriceLabels> }) {
  const { t } = useTranslation();
  return (
    <span
      data-component='sale-tag'
      className={cn(
        'relative inline-flex -rotate-3 items-center gap-1.5 self-center rounded-r-md bg-brand-light py-1 pr-2.5 pl-4.5 text-brand-ink shadow-sm shadow-brand-deep/30',
        '[clip-path:polygon(10px_0,100%_0,100%_100%,10px_100%,0_50%)]',
      )}
    >
      <span aria-hidden='true' className='absolute top-1/2 left-2 size-1.5 -translate-y-1/2 rounded-full bg-brand-ink/30' />
      <ZapIcon aria-hidden='true' className='size-3 fill-current' />
      <span className='text-[0.6875rem] font-bold tracking-[0.06em] uppercase'>{t('pricing_sale_badge')}</span>
      <span aria-hidden='true' className='h-3 w-px bg-brand-ink/25' />
      <span className='text-xs font-semibold'>{t('pricing_sale_save', prices)}</span>
    </span>
  );
}

// Intentions: the publishing price, said the same way everywhere it's shown (the Deploy tab, the Pricing
// page): during a sale the regular price struck through next to the sale one and a sale tag, then the
// monthly charge underneath. `size` 'lg' is the Pricing page's big version.
export default function PriceTag({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  const { t, i18n } = useTranslation();
  const prices = getPriceLabels(i18n.language);

  return (
    <div data-component='price-tag' className={cn('flex flex-col gap-1', className)}>
      <div className='flex flex-wrap items-baseline gap-x-2.5 gap-y-1'>
        {prices.isOnSale && (
          <span className={cn('text-muted-foreground line-through', size === 'lg' ? 'text-2xl' : 'text-lg')}>
            {prices.regularPrice}
          </span>
        )}
        <span className={cn('font-heading font-bold tracking-[-0.03em]', size === 'lg' ? 'text-5xl' : 'text-3xl')}>
          {prices.price}
        </span>
        <span className='text-sm text-muted-foreground'>{t('pricing_one_time')}</span>
        {prices.isOnSale && <SaleTag prices={prices} />}
      </div>
      <p className={cn('text-muted-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>
        {t('pricing_then_monthly', prices)}
      </p>
    </div>
  );
}
