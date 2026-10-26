import { callBe } from 'src/utils/request';
import type { DomainPricing, DomainSearchResult } from 'src/types/domains';

// Intentions: finding a domain for a site (biveit-backend controllers/domains) -- what's free and what it costs.

async function searchDomains(query: string): Promise<DomainSearchResult> {
  return callBe({ url: '/domains/search', params: { q: query } });
}

// years: omit for the TLD's minimum term.
async function getDomainPricing(domainName: string, options: { years?: number } = {}): Promise<DomainPricing> {
  return callBe({ url: `/domains/${encodeURIComponent(domainName)}/pricing`, params: { years: options.years } });
}

export {
  searchDomains,
  getDomainPricing,
};
