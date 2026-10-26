// Shapes of the domain API (biveit-backend controllers/domains). snake_case to match the API.

// A domain someone could buy, as search returns it. Prices are the registrar's, in USD, for the TLD's shortest
// term (min_years: 1 for most, 2 for .ai); only plain registrations count as available.
export type DomainOffer = {
  domain: string;
  available: boolean;
  premium: boolean;
  price_usd: number | null;
  renewal_price_usd: number | null;
  min_years: number | null; // the term the prices are for (null when taken)
};

export type DomainSearchResult = {
  exact: DomainOffer[];
  suggestions: DomainOffer[];
};

export type DomainPricing = {
  domain: string;
  years: number | null;
  premium: boolean;
  price_usd: number;
  renewal_price_usd: number;
  transfer_price_usd: number;
};

// The domain owner's contact, in the registrar's (Name.com's) shape. companyName, when filled, makes that
// company the legal owner. phone is E.164: '+84901234567'.
export type DomainContact = {
  firstName: string;
  lastName: string;
  companyName?: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
};

// A domain we hold, passed through in Name.com's shape (camelCase -- it's theirs, not ours).
export type RegistrarDomain = {
  domainName: string;
  createDate?: string;
  expireDate?: string;
  autorenewEnabled?: boolean;
  locked?: boolean;
  privacyEnabled?: boolean;
  transferLockExpiresAt?: string;
  nameservers?: string[];
  contacts?: Record<string, DomainContact & { isVerified?: boolean }>;
};

export type DnsRecord = {
  id?: number;
  host: string; // '' is the apex
  type: 'A' | 'AAAA' | 'ANAME' | 'CNAME' | 'MX' | 'NS' | 'SRV' | 'TXT';
  answer: string;
  ttl?: number;
  priority?: number;
  fqdn?: string;
};

// A contact still owing ICANN email verification (Name.com's shape). Unverified past verifyBy -> its domains get
// suspended.
export type DomainVerification = {
  verificationId: number;
  email: string;
  domains: string[];
  verifyBy: string;
  createDate: string;
};
