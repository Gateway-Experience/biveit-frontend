import { PRICING } from 'src/utils/constants';

// [Pure] A USD amount the way the user's language writes money ("$39", "39 US$", "39 $"...), without
// cents when there are none.
function formatUsd(amount: number, language?: string) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

// [Pure] The prices ready to show, as i18n params — every price text takes the same ones:
//   price         what publishing costs right now (the sale price while there's a sale)
//   regularPrice  the price without the sale (shown struck through)
//   monthlyPrice  the monthly charge
//   domainLimit   domains costing less than this are free
// plus isOnSale, to decide whether to show the sale at all.
function getPriceLabels(language?: string) {
  const isOnSale = PRICING.salePublishPrice !== null && PRICING.salePublishPrice < PRICING.publishPrice;
  return {
    isOnSale,
    price: formatUsd(isOnSale ? PRICING.salePublishPrice as number : PRICING.publishPrice, language),
    regularPrice: formatUsd(PRICING.publishPrice, language),
    monthlyPrice: formatUsd(PRICING.monthlyPrice, language),
    domainLimit: formatUsd(PRICING.freeDomainBelow, language),
  };
}

export {
  formatUsd,
  getPriceLabels,
};
