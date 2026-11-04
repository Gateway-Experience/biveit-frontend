import { PRICING } from 'src/utils/constants';

// [Pure] A USD amount the way the user's language writes money ("$19", "19 US$", "19 $"...), without
// cents when there are none.
function formatUsd(amount: number, language?: string) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

// [Pure] The prices ready to show, as i18n params — every price text takes the same ones:
//   oneTimePrice     the one-time price (code + a month of the AI assistant)
//   monthlyPrice     the monthly subscription
//   yearlyPrice      the yearly subscription
//   yearlyPerMonth   the yearly one spread over 12 months ("$13.25")
//   yearlySaving     how much yearly saves over 12 monthly payments ("30%")
//   domainFromPrice  the cheapest domain, per year
//   freeDomainMaxPrice  on yearly, the dearest domain whose first year is free
function getPriceLabels(language?: string) {
  const yearlySaving = 1 - PRICING.yearlyPrice / (PRICING.monthlyPrice * 12);
  return {
    oneTimePrice: formatUsd(PRICING.oneTimePrice, language),
    monthlyPrice: formatUsd(PRICING.monthlyPrice, language),
    yearlyPrice: formatUsd(PRICING.yearlyPrice, language),
    yearlyPerMonth: formatUsd(Math.round(PRICING.yearlyPrice / 12 * 100) / 100, language),
    yearlySaving: new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(yearlySaving),
    domainFromPrice: formatUsd(PRICING.domainFromPrice, language),
    freeDomainMaxPrice: formatUsd(PRICING.yearlyFreeDomainMaxPrice, language),
  };
}

// The ways to pay, as both the Pricing page (full cards) and the Deploy tab (compact rows) show them, the
// lightest commitment first. Text is i18n keys taking getPriceLabels' params:
//   priceParam  which of getPriceLabels' prices is the plan's
//   noteKey     an extra line under the price (yearly's per-month and saving)
//   domainKey   what the domain costs on this plan — for the subscriptions, a separate item on top of the plan
//   isBestValue highlighted, with a "Best value" badge
const PLANS = [
  {
    id: 'one_time',
    nameKey: 'pricing_plan_code_name',
    taglineKey: 'pricing_plan_code_tagline',
    priceParam: 'oneTimePrice',
    periodKey: 'pricing_period_once',
    noteKey: null,
    featureKeys: ['pricing_feature_download', 'pricing_feature_ai_month', 'pricing_feature_self_host'],
    domainKey: null,
    isBestValue: false,
  },
  {
    id: 'monthly',
    nameKey: 'pricing_plan_monthly_name',
    taglineKey: 'pricing_plan_monthly_tagline',
    priceParam: 'monthlyPrice',
    periodKey: 'pricing_period_month',
    noteKey: null,
    featureKeys: ['pricing_feature_hosting', 'pricing_feature_domain_help', 'pricing_feature_ai_always'],
    domainKey: 'pricing_domain_extra',
    isBestValue: false,
  },
  {
    id: 'yearly',
    nameKey: 'pricing_plan_yearly_name',
    taglineKey: 'pricing_plan_yearly_tagline',
    priceParam: 'yearlyPrice',
    periodKey: 'pricing_period_year',
    noteKey: 'pricing_yearly_note',
    featureKeys: ['pricing_feature_everything_monthly', 'pricing_feature_free_domain'],
    domainKey: 'pricing_domain_extra_yearly',
    isBestValue: true,
  },
] as const;

export {
  formatUsd,
  getPriceLabels,
  PLANS,
};
