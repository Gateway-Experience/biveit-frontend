import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { Badge } from 'src/components/shadui/badge';
import { getPriceLabels } from 'src/services/pricing';

// Intentions: the publishing price, said the same way everywhere it's shown (the Deploy tab, the Pricing
// page): during a sale the regular price struck through next to the sale one and a "sale" badge, then the
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
        {prices.isOnSale && <Badge className='self-center'>{t('pricing_sale_badge')}</Badge>}
      </div>
      <p className={cn('text-muted-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>
        {t('pricing_then_monthly', prices)}
      </p>
    </div>
  );
}
