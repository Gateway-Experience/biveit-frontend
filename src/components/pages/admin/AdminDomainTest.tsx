import _ from 'lodash';
import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import Modal from 'src/components/common/Modal';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { Input } from 'src/components/shadui/input';
import { Textarea } from 'src/components/shadui/textarea';
import {
  ADMIN_QUERY_KEY,
  deleteTestRecord,
  getDomainTestAccount,
  getTestAuthCode,
  getTestDomain,
  listTestDomains,
  listTestRecords,
  listTestVerifications,
  registerTestDomain,
  renewTestDomain,
  resendTestVerification,
  saveTestRecord,
  setTestNameservers,
  updateTestDomain,
} from 'src/services/admin';
import { getDomainPricing, searchDomains } from 'src/services/domains';
import type { DnsRecord, DomainContact, DomainOffer } from 'src/types/domains';
import { PATHS } from 'src/utils/constants';

// Intentions: a test bench for the domain registrar (/admin/domain-name-test) -- every primitive the backend's
// domains module has, by hand: search and price, buy, then manage what we hold (locks, autorenew, privacy,
// renewal, auth code, nameservers, DNS records). Sandbox only: the backend refuses all of it (409 NOT_SANDBOX)
// while it points at the live registrar, so nothing here can buy a real domain. English only, like the rest of
// /admin.

const DOMAIN_TEST_QUERY_KEY = [ADMIN_QUERY_KEY, 'domain-test'];

// A made-up owner for sandbox purchases -- the sandbox never touches real registries.
const SANDBOX_REGISTRANT: DomainContact = {
  firstName: 'Probe',
  lastName: 'Biveit',
  address1: '1 Test Street',
  city: 'Ho Chi Minh City',
  state: 'HCM',
  zip: '700000',
  country: 'VN',
  email: 'admin@biveit.com', // a real inbox, so the verification email can be seen arriving
  phone: '+84901234567',
};

const EMPTY_RECORD: DnsRecord = { host: '', type: 'A', answer: '', ttl: 300 };

// The search table's sortable columns. null = as the backend returned them (our TLDs first, then suggestions).
type OfferSortField = 'domain' | 'min_years' | 'price_usd' | 'renewal_price_usd';
const OFFER_COLUMNS: { field: OfferSortField; label: string }[] = [
  { field: 'domain', label: 'Domain' },
  { field: 'min_years', label: 'Shortest term' },
  { field: 'price_usd', label: 'First term' },
  { field: 'renewal_price_usd', label: 'Renewal (same term)' },
];

// The backend's detail is the registrar's own message for registrar refusals (e.g. a 60-day transfer lock).
const _toErrorMessage = (error: unknown) => `${_.get(error, 'code', '')} ${_.get(error, 'data.detail', 'request failed')}`;
const _formatUsd = (amount: number | null | undefined) => (_.isNil(amount) ? '—' : `$${amount}`);
const _formatDate = (date: string | undefined) => (date ? new Date(date).toLocaleString() : '—');

export default function AdminDomainTest() {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const { data: account, error: accountError, refetch: refetchAccount } = useQuery({
    queryKey: [...DOMAIN_TEST_QUERY_KEY, 'account'],
    queryFn: getDomainTestAccount,
    staleTime: 0,
    retry: false,
  });
  const { data: heldDomains, refetch: refetchDomains } = useQuery({
    queryKey: [...DOMAIN_TEST_QUERY_KEY, 'domains'],
    queryFn: listTestDomains,
    staleTime: 0,
    enabled: !!account,
  });
  const refreshAccount = () => {
    refetchAccount();
    refetchDomains();
  };

  return (
    <div className='flex flex-col gap-6' data-page='admin-domain-test'>
      <Link to={PATHS.admin} className='text-sm text-muted-foreground hover:underline'>← Admin</Link>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>Domain registrar test bench</h1>
        <Button variant='outline' size='sm' onClick={refreshAccount} data-action='refresh'>Refresh</Button>
      </div>

      {accountError && (
        <p className='text-sm text-destructive'>
          {_.get(accountError, 'data.detail') === 'NOT_SANDBOX'
            ? 'The backend points at the LIVE registrar -- this page only works against the sandbox.'
            : `Couldn’t reach the registrar: ${_toErrorMessage(accountError)}`}
        </p>
      )}
      {account && (
        <Card size='sm' data-section='account'>
          <CardContent className='flex flex-wrap gap-6 text-sm'>
            <span><Badge>sandbox</Badge></span>
            <span>Account: <span className='font-mono'>{account.username}</span></span>
            <span>Balance: <span className='font-mono'>{_formatUsd(account.balance_usd)}</span></span>
          </CardContent>
        </Card>
      )}

      {account && (
        <>
          <DomainSearch onBought={refreshAccount} />
          <Card size='sm' data-section='held-domains'>
            <CardHeader>
              <CardTitle>Domains we hold ({heldDomains?.totalCount ?? _.size(heldDomains?.domains)})</CardTitle>
            </CardHeader>
            <CardContent className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='text-left text-muted-foreground'>
                  <tr className='border-b'>
                    <th className='py-2 pr-4 font-medium'>Domain</th>
                    <th className='py-2 pr-4 font-medium'>Expires</th>
                    <th className='py-2 pr-4 font-medium'>Locked</th>
                    <th className='py-2 font-medium'>Autorenew</th>
                  </tr>
                </thead>
                <tbody>
                  {_.map(heldDomains?.domains, domain => (
                    <tr
                      key={domain.domainName}
                      className={`cursor-pointer border-b last:border-0 hover:bg-muted/50 ${domain.domainName === selectedDomain ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedDomain(domain.domainName)}
                      data-domain={domain.domainName}
                    >
                      <td className='py-2 pr-4 font-medium text-primary'>{domain.domainName}</td>
                      <td className='py-2 pr-4'>{_formatDate(domain.expireDate)}</td>
                      <td className='py-2 pr-4'>{domain.locked ? 'yes' : 'no'}</td>
                      <td className='py-2'>{domain.autorenewEnabled ? 'on' : 'off'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {selectedDomain && <HeldDomain key={selectedDomain} domainName={selectedDomain} onChanged={refreshAccount} />}
          <PendingVerifications />
        </>
      )}
    </div>
  );
}

// Search, then buy one of the results (a modal: term, the owner's contact as JSON, and a live price check).
function DomainSearch({ onBought }: { onBought: () => void }) {
  const notify = useNotification();
  const [query, setQuery] = useState('');
  const [offerToBuy, setOfferToBuy] = useState<DomainOffer | null>(null);
  const [years, setYears] = useState(1);
  const [registrantJson, setRegistrantJson] = useState(JSON.stringify(SANDBOX_REGISTRANT, null, 2));
  const [offerSort, setOfferSort] = useState<{ field: OfferSortField; order: 'asc' | 'desc' } | null>(null);
  const { mutate: search, data: results, isPending: isSearching } = useMutation({
    mutationFn: () => searchDomains(query),
    onError: error => notify('error', `Search failed: ${_toErrorMessage(error)}`),
  });
  const { mutate: checkPrice, data: pricing, isPending: isPricing, reset: resetPricing } = useMutation({
    mutationFn: () => getDomainPricing(offerToBuy?.domain ?? '', { years }),
    onError: error => notify('error', `Pricing failed: ${_toErrorMessage(error)}`),
  });
  const { mutate: buy, isPending: isBuying } = useMutation({
    mutationFn: () => registerTestDomain(offerToBuy?.domain ?? '', years, JSON.parse(registrantJson)),
    onSuccess: () => {
      notify('success', `Bought ${offerToBuy?.domain}`);
      setOfferToBuy(null);
      onBought();
    },
    onError: error => notify('error', `Buying failed: ${_toErrorMessage(error)}`),
  });
  const openBuy = (offer: DomainOffer) => {
    resetPricing();
    setYears(offer.min_years ?? 1);
    setOfferToBuy(offer);
  };
  // Clicking a header sorts by it, again flips the order. Taken domains always sink to the bottom.
  const sortOffersBy = (field: OfferSortField) => setOfferSort(
    offerSort?.field === field ? { field, order: offerSort.order === 'asc' ? 'desc' : 'asc' } : { field, order: 'asc' },
  );
  const offers = [
    ..._.map(results?.exact, offer => ({ ...offer, is_our_tld: true })),
    ..._.map(results?.suggestions, offer => ({ ...offer, is_our_tld: false })),
  ];
  const sortedOffers = offerSort
    ? _.orderBy(offers, [offer => !offer.available, offerSort.field], ['asc', offerSort.order])
    : offers;

  return (
    <Card size='sm' data-section='search'>
      <CardHeader>
        <CardTitle>Search</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <form className='flex gap-2' onSubmit={event => { event.preventDefault(); search(); }}>
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder='myshop, or myshop.io' />
          <Button type='submit' disabled={!query.trim() || isSearching} data-action='search'>
            {isSearching && <Spinner data-icon='inline-start' />}
            Search
          </Button>
        </form>
        {results && (
          <p className='text-xs text-muted-foreground'>
            Prices are for the shortest term the TLD allows. Renewal is what extending by that same term costs later. Longer terms multiply -- check them in the buy dialog. “our TLDs” = your name as typed across
            the TLDs we search; the rest are the registrar’s ideas.
          </p>
        )}
        {results && (
          <table className='w-full text-sm'>
            <thead className='text-left text-muted-foreground'>
              <tr className='border-b'>
                {_.map(OFFER_COLUMNS, column => (
                  <th key={column.field} className='py-2 pr-4 font-medium'>
                    <button type='button' className='hover:text-foreground' onClick={() => sortOffersBy(column.field)} data-sortfield={column.field}>
                      {column.label}
                      {offerSort?.field === column.field && (offerSort.order === 'asc' ? ' ↑' : ' ↓')}
                    </button>
                  </th>
                ))}
                <th className='py-2' />
              </tr>
            </thead>
            <tbody>
              {_.map(sortedOffers, offer => (
                <tr key={offer.domain} className='border-b last:border-0' data-domain={offer.domain}>
                  <td className='py-2 pr-4'>
                    {offer.domain}
                    {offer.is_our_tld && <Badge variant='outline' className='ml-2'>our TLDs</Badge>}
                    {offer.premium && <Badge variant='outline' className='ml-2'>premium</Badge>}
                  </td>
                  <td className='py-2 pr-4'>{offer.min_years ? `${offer.min_years} yr` : '—'}</td>
                  <td className='py-2 pr-4'>{offer.available ? _formatUsd(offer.price_usd) : <span className='text-muted-foreground'>taken</span>}</td>
                  <td className='py-2 pr-4'>{_formatUsd(offer.renewal_price_usd)}</td>
                  <td className='py-2 text-right'>
                    {offer.available && <Button size='xs' onClick={() => openBuy(offer)} data-action='buy'>Buy</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Modal
        open={!!offerToBuy}
        onClose={() => !isBuying && setOfferToBuy(null)}
        title={`Buy ${offerToBuy?.domain}`}
        size='lg'
        fullScreenMobile={false}
        buttons={[
          <Button key='cancel' variant='outline' disabled={isBuying} onClick={() => setOfferToBuy(null)}>Cancel</Button>,
          <Button key='buy' disabled={isBuying} onClick={() => buy()} data-action='confirm-buy'>
            {isBuying && <Spinner data-icon='inline-start' />}
            Buy (sandbox credit)
          </Button>,
        ]}
      >
        <div className='flex flex-col gap-3 text-sm'>
          <label className='flex items-center gap-2'>
            Years
            <Input type='number' min={offerToBuy?.min_years ?? 1} max={10} value={years} onChange={event => { setYears(Number(event.target.value)); resetPricing(); }} className='w-24' />
            <Button variant='outline' size='sm' disabled={isPricing} onClick={() => checkPrice()} data-action='check-price'>Check price</Button>
          </label>
          {pricing && (
            <p>
              {pricing.years ?? 'min'} year(s): {_formatUsd(pricing.price_usd)}, then {_formatUsd(pricing.renewal_price_usd)} per renewal
              {pricing.premium && ' (premium)'}
            </p>
          )}
          <span>Registrant (becomes the owner -- every contact role gets it):</span>
          <Textarea value={registrantJson} onChange={event => setRegistrantJson(event.target.value)} className='font-mono text-xs' />
        </div>
      </Modal>
    </Card>
  );
}

// One domain we hold: its state, and every way we can change it.
function HeldDomain({ domainName, onChanged }: { domainName: string; onChanged: () => void }) {
  const notify = useNotification();
  const [renewYears, setRenewYears] = useState(1);
  const [nameserversText, setNameserversText] = useState<string | null>(null);
  const [recordDraft, setRecordDraft] = useState<DnsRecord>(EMPTY_RECORD);
  const { data: domain, refetch: refetchDomain } = useQuery({
    queryKey: [...DOMAIN_TEST_QUERY_KEY, 'domain', domainName],
    queryFn: () => getTestDomain(domainName),
    staleTime: 0,
  });
  const { data: records, refetch: refetchRecords } = useQuery({
    queryKey: [...DOMAIN_TEST_QUERY_KEY, 'records', domainName],
    queryFn: () => listTestRecords(domainName),
    staleTime: 0,
  });
  // Every action here shares the same shape: run it, say how it went, re-read the domain.
  const { mutate: runAction, isPending: isActing } = useMutation({
    mutationFn: ({ action }: { label: string; action: () => Promise<unknown> }) => action(),
    onSuccess: (_result, { label }) => {
      notify('success', label);
      refetchDomain();
      refetchRecords();
      onChanged();
    },
    onError: (error, { label }) => notify('error', `${label} failed: ${_toErrorMessage(error)}`),
  });
  const { mutate: revealAuthCode, data: authCode } = useMutation({
    mutationFn: () => getTestAuthCode(domainName),
    onError: error => notify('error', `Auth code failed: ${_toErrorMessage(error)}`),
  });
  const toggles = [
    { field: 'locked', label: 'Locked', value: domain?.locked },
    { field: 'autorenewEnabled', label: 'Autorenew', value: domain?.autorenewEnabled },
    { field: 'privacyEnabled', label: 'Whois privacy', value: domain?.privacyEnabled },
  ] as const;
  const registrant = domain?.contacts?.registrant;

  return (
    <Card size='sm' data-section='held-domain' data-domain={domainName}>
      <CardHeader>
        <CardTitle>{domainName}</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-5 text-sm'>
        <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
          <span>Created: {_formatDate(domain?.createDate)}</span>
          <span>Expires: {_formatDate(domain?.expireDate)}</span>
          <span>Transfer lock until: {_formatDate(domain?.transferLockExpiresAt)}</span>
          <span>
            Registrant: {registrant ? `${registrant.firstName} ${registrant.lastName} <${registrant.email}>` : '—'}
            {registrant && <Badge variant='outline' className='ml-2'>{registrant.isVerified ? 'verified' : 'unverified'}</Badge>}
          </span>
        </div>

        <div className='flex flex-wrap gap-2'>
          {_.map(toggles, toggle => (
            <Button
              key={toggle.field}
              variant='outline'
              size='sm'
              disabled={isActing || !domain}
              onClick={() => runAction({
                label: `${toggle.label} ${toggle.value ? 'off' : 'on'}`,
                action: () => updateTestDomain(domainName, { [toggle.field]: !toggle.value }),
              })}
              data-action={`toggle-${toggle.field.toLowerCase()}`}
            >
              {toggle.label}: {toggle.value ? 'on' : 'off'} → turn {toggle.value ? 'off' : 'on'}
            </Button>
          ))}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          Renew for
          <Input type='number' min={1} max={10} value={renewYears} onChange={event => setRenewYears(Number(event.target.value))} className='w-24' />
          year(s)
          <Button size='sm' disabled={isActing} onClick={() => runAction({ label: `Renewed ${renewYears} year(s)`, action: () => renewTestDomain(domainName, renewYears) })} data-action='renew'>
            Renew
          </Button>
          <Button variant='outline' size='sm' onClick={() => revealAuthCode()} data-action='auth-code'>Get auth code</Button>
          {authCode && <span className='font-mono' data-authcode>{authCode.auth_code}</span>}
        </div>

        <div className='flex flex-col gap-2'>
          <span className='font-medium'>Nameservers (one per line)</span>
          <Textarea
            value={nameserversText ?? _.join(domain?.nameservers, '\n')}
            onChange={event => setNameserversText(event.target.value)}
            className='min-h-20 font-mono text-xs'
          />
          <Button
            variant='outline'
            size='sm'
            className='self-start'
            disabled={isActing || nameserversText === null}
            onClick={() => runAction({
              label: 'Nameservers set',
              action: () => setTestNameservers(domainName, _.compact(_.map(_.split(nameserversText ?? '', '\n'), _.trim))),
            })}
            data-action='set-nameservers'
          >
            Save nameservers
          </Button>
        </div>

        <div className='flex flex-col gap-2'>
          <span className='font-medium'>DNS records (only answer while the domain is on Name.com’s nameservers)</span>
          <table className='w-full text-sm'>
            <thead className='text-left text-muted-foreground'>
              <tr className='border-b'>
                <th className='py-2 pr-4 font-medium'>Host</th>
                <th className='py-2 pr-4 font-medium'>Type</th>
                <th className='py-2 pr-4 font-medium'>Answer</th>
                <th className='py-2 pr-4 font-medium'>TTL</th>
                <th className='py-2' />
              </tr>
            </thead>
            <tbody>
              {_.map(records, record => (
                <tr key={record.id} className='border-b' data-recordid={record.id}>
                  <td className='py-2 pr-4 font-mono'>{record.host || '@'}</td>
                  <td className='py-2 pr-4'>{record.type}</td>
                  <td className='py-2 pr-4 font-mono break-all'>{record.answer}</td>
                  <td className='py-2 pr-4'>{record.ttl}</td>
                  <td className='flex justify-end gap-1 py-2'>
                    <Button variant='ghost' size='xs' onClick={() => setRecordDraft(_.pick(record, ['id', 'host', 'type', 'answer', 'ttl', 'priority']) as DnsRecord)} data-action='edit-record'>Edit</Button>
                    <Button
                      variant='destructive'
                      size='xs'
                      disabled={isActing}
                      onClick={() => runAction({ label: 'Record deleted', action: () => deleteTestRecord(domainName, record.id as number) })}
                      data-action='delete-record'
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            className='flex flex-wrap items-center gap-2'
            onSubmit={event => {
              event.preventDefault();
              runAction({ label: recordDraft.id ? 'Record updated' : 'Record added', action: () => saveTestRecord(domainName, recordDraft) });
              setRecordDraft(EMPTY_RECORD);
            }}
          >
            <Input value={recordDraft.host} onChange={event => setRecordDraft({ ...recordDraft, host: event.target.value })} placeholder='host ("" = apex)' className='w-36' />
            <select
              value={recordDraft.type}
              onChange={event => setRecordDraft({ ...recordDraft, type: event.target.value as DnsRecord['type'] })}
              className='h-11 rounded-lg border border-input bg-card px-2'
            >
              {_.map(['A', 'AAAA', 'ANAME', 'CNAME', 'MX', 'NS', 'SRV', 'TXT'], type => <option key={type}>{type}</option>)}
            </select>
            <Input value={recordDraft.answer} onChange={event => setRecordDraft({ ...recordDraft, answer: event.target.value })} placeholder='answer' className='min-w-48 flex-1' />
            <Input type='number' value={recordDraft.ttl ?? 300} onChange={event => setRecordDraft({ ...recordDraft, ttl: Number(event.target.value) })} className='w-24' />
            <Button type='submit' size='sm' disabled={isActing || !recordDraft.answer} data-action='save-record'>
              {recordDraft.id ? `Update #${recordDraft.id}` : 'Add record'}
            </Button>
            {recordDraft.id && <Button variant='ghost' size='sm' onClick={() => setRecordDraft(EMPTY_RECORD)}>Cancel edit</Button>}
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

// ICANN email verifications still pending on our account, with a resend. A new purchase shows up here only ~10
// minutes later (the registrar builds the list on a schedule).
function PendingVerifications() {
  const notify = useNotification();
  const { data: verifications, refetch, isFetching } = useQuery({
    queryKey: [...DOMAIN_TEST_QUERY_KEY, 'verifications'],
    queryFn: listTestVerifications,
    staleTime: 0,
  });
  const { mutate: resend, isPending: isResending } = useMutation({
    mutationFn: (verificationId: number) => resendTestVerification(verificationId),
    onSuccess: result => notify('success', `Verification email sent again (next resend from ${_formatDate(result.nextEligibleAt)})`),
    onError: error => notify('error', `Resend failed: ${_toErrorMessage(error)}`),
  });

  return (
    <Card size='sm' data-section='verifications'>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Pending email verifications ({_.size(verifications)})</CardTitle>
        <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>Refresh</Button>
      </CardHeader>
      <CardContent className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='text-left text-muted-foreground'>
            <tr className='border-b'>
              <th className='py-2 pr-4 font-medium'>Email</th>
              <th className='py-2 pr-4 font-medium'>Domains</th>
              <th className='py-2 pr-4 font-medium'>Verify by</th>
              <th className='py-2' />
            </tr>
          </thead>
          <tbody>
            {_.map(verifications, verification => (
              <tr key={verification.verificationId} className='border-b last:border-0' data-verificationid={verification.verificationId}>
                <td className='py-2 pr-4'>{verification.email}</td>
                <td className='py-2 pr-4'>{_.join(verification.domains, ', ')}</td>
                <td className='py-2 pr-4'>{_formatDate(verification.verifyBy)}</td>
                <td className='py-2 text-right'>
                  <Button size='xs' variant='outline' disabled={isResending} onClick={() => resend(verification.verificationId)} data-action='resend-verification'>
                    Resend email
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
