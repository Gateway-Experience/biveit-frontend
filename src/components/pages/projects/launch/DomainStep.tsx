import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { CheckIcon, SearchIcon, SparklesIcon } from 'lucide-react';

import Info from 'src/components/common/Info';
import { Spinner } from 'src/components/common/Spinner';
import { DnsRecordsTable } from 'src/components/pages/projects/launch/LaunchProgress';
import { Button } from 'src/components/shadui/button';
import { Input } from 'src/components/shadui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/components/shadui/tabs';
import { LAUNCH_QUERY_KEY, checkOwnDomain, searchLaunchDomains } from 'src/services/launch';
import { formatUsd } from 'src/services/pricing';
import type { DomainChoice, DomainOffer } from 'src/types/launch';

// Intentions: the launch dialog's domain question -- a hosted site needs one (for now): buy it through us, or use the
// user's own. Buying: with nothing typed, ideas around the project's name; typing, search results. Each shows its
// price, struck through to free for the first year when the plan is yearly. Own: the two DNS records to add and
// whether they're found yet (re-checked every few seconds) -- not ready yet is a warning, not a stop.
// `freeFirstYear`: whether eligible domains are free this time (yearly plan); `onSwitchToYearly` offers that switch
// from the monthly plan (absent when it doesn't apply).

const _SEARCH_DEBOUNCE_MS = 400;
const _OWN_RECHECK_MS = 30000;

export default function DomainStep({ projectId, freeFirstYear, onSwitchToYearly, onAskAgent, onChoose, onBack }: {
  projectId: number;
  freeFirstYear: boolean;
  onSwitchToYearly?: () => void;
  onAskAgent: () => void;
  onChoose: (domain: DomainChoice) => void;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'buy' | 'own'>('buy');

  return (
    <div className='flex flex-col gap-4' data-component='launch-domain-step'>
      <Tabs value={tab} onValueChange={value => setTab(value as 'buy' | 'own')}>
        <TabsList className='w-full'>
          <TabsTrigger value='buy' className='flex-1'>{t('launch_domain_tab_buy')}</TabsTrigger>
          <TabsTrigger value='own' className='flex-1'>{t('launch_domain_tab_own')}</TabsTrigger>
        </TabsList>
        <TabsContent value='buy' className='pt-3'>
          <BuyDomain projectId={projectId} freeFirstYear={freeFirstYear} onSwitchToYearly={onSwitchToYearly} onChoose={onChoose} />
        </TabsContent>
        <TabsContent value='own' className='pt-3'>
          <OwnDomain projectId={projectId} onChoose={onChoose} />
        </TabsContent>
      </Tabs>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        {onBack ? <Button variant='ghost' onClick={onBack}>{t('launch_back')}</Button> : <span />}
        <Button variant='link' size='sm' className='text-muted-foreground' onClick={onAskAgent} data-action='ask-agent'>
          <SparklesIcon data-icon='inline-start' />
          {t('launch_domain_ask_agent')}
        </Button>
      </div>
    </div>
  );
}

function BuyDomain({ projectId, freeFirstYear, onSwitchToYearly, onChoose }: {
  projectId: number;
  freeFirstYear: boolean;
  onSwitchToYearly?: () => void;
  onChoose: (domain: DomainChoice) => void;
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [selected, setSelected] = useState<DomainOffer | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearchedQuery(_.trim(query)), _SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);
  const { data: offers, isFetching, isError } = useQuery({
    queryKey: [LAUNCH_QUERY_KEY, projectId, 'domains', searchedQuery],
    queryFn: () => searchLaunchDomains(projectId, searchedQuery),
    staleTime: 60 * 1000,
  });
  const money = (amount: number) => formatUsd(amount, i18n.language);

  return (
    <div className='flex flex-col gap-3'>
      <div className='relative'>
        <SearchIcon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('launch_domain_search_placeholder')} className='pl-9' data-input='domain-search' />
      </div>
      {!searchedQuery && <p className='text-xs font-medium text-muted-foreground'>{t('launch_domain_suggestions')}</p>}
      {isFetching && !offers && <div className='flex justify-center py-6'><Spinner className='size-5 text-muted-foreground' /></div>}
      {isError && <p className='text-sm text-destructive'>{t('launch_error_generic')}</p>}
      {offers && _.isEmpty(offers) && <p className='text-sm text-muted-foreground'>{t('launch_domain_none_found')}</p>}
      <div className={cn('flex max-h-72 flex-col gap-1.5 overflow-y-auto', isFetching && 'opacity-60')}>
        {_.map(offers, offer => {
          const isFree = freeFirstYear && offer.free_first_year_eligible;
          const isSelected = selected?.domain === offer.domain;
          return (
            <button
              key={offer.domain}
              type='button'
              disabled={!offer.sold}
              onClick={() => setSelected(offer)}
              data-domain={offer.domain}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                offer.sold ? 'hover:bg-muted/50' : 'cursor-not-allowed opacity-60',
                isSelected && 'border-primary bg-muted',
              )}
            >
              <span className='flex min-w-0 items-center gap-2'>
                {isSelected && <CheckIcon className='size-4 shrink-0 text-primary' />}
                <span className='truncate font-medium'>{offer.domain}</span>
              </span>
              <span className='shrink-0 text-right text-xs'>
                {!offer.available && <span className='text-muted-foreground'>{t('launch_domain_taken')}</span>}
                {offer.available && !offer.sold && <span className='text-muted-foreground'>{t('launch_domain_not_sold')}</span>}
                {offer.sold && offer.price_per_year !== null && (isFree
                  ? (
                    <span>
                      <s className='text-muted-foreground'>{money(offer.price_per_year)}</s>
                      {' '}<strong>{money(0)}</strong> {t('launch_domain_first_year')}
                      <Info text={t('launch_domain_free_info', { price: money(offer.price_per_year) })} leftSpacing='0.25rem' />
                    </span>
                  )
                  : <strong>{t('launch_domain_per_year', { price: money(offer.price_per_year) })}</strong>)}
                {offer.sold && !freeFirstYear && offer.free_first_year_eligible && onSwitchToYearly && (
                  <span className='block text-muted-foreground'>{t('launch_domain_free_with_yearly')}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {selected && !freeFirstYear && selected.free_first_year_eligible && onSwitchToYearly && (
        <Button variant='outline' size='sm' className='self-start' onClick={onSwitchToYearly} data-action='switch-yearly'>
          {t('launch_domain_switch_yearly')}
        </Button>
      )}
      <Button
        disabled={!selected}
        onClick={() => selected && selected.price_per_year !== null && onChoose({
          kind: 'buy', name: selected.domain, price_per_year: selected.price_per_year, free_first_year_eligible: selected.free_first_year_eligible,
        })}
        data-action='choose-domain'
      >
        {t('launch_continue')}
      </Button>
    </div>
  );
}

function OwnDomain({ projectId, onChoose }: { projectId: number; onChoose: (domain: DomainChoice) => void }) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const [checkedDomain, setCheckedDomain] = useState<string | null>(null);
  const { data: check, isFetching } = useQuery({
    queryKey: [LAUNCH_QUERY_KEY, projectId, 'own-domain', checkedDomain],
    queryFn: () => checkOwnDomain(projectId, checkedDomain as string),
    enabled: !!checkedDomain,
    // Keep looking while they add the records; done once both are found or it can't be used at all.
    refetchInterval: query => (query.state.data && (query.state.data.verified || query.state.data.blocked) ? false : _OWN_RECHECK_MS),
  });

  return (
    <div className='flex flex-col gap-3'>
      <form className='flex gap-2' onSubmit={event => { event.preventDefault(); setCheckedDomain(_.trim(typed) || null); }}>
        <Input value={typed} onChange={event => setTyped(event.target.value)} placeholder={t('launch_own_placeholder')} data-input='own-domain' />
        <Button type='submit' variant='outline' disabled={!_.trim(typed) || isFetching} data-action='check-own-domain'>
          {isFetching && <Spinner data-icon='inline-start' />}
          {t('launch_own_check')}
        </Button>
      </form>
      {check?.blocked && <p className='text-sm text-destructive'>{t(`launch_own_blocked_${check.blocked}`)}</p>}
      {check && !check.blocked && (
        <>
          <p className='text-sm'>{t('launch_own_records_intro')}</p>
          <div className='rounded-xl border p-3'><DnsRecordsTable records={check.records} /></div>
          {check.verified
            ? <p className='text-sm text-primary'>{t('launch_own_ready')}</p>
            : <p className='text-sm text-muted-foreground'>{t('launch_own_not_ready_warning', { domain: check.domain })}</p>}
          <Button onClick={() => onChoose({ kind: 'own', name: check.domain, records: check.records })} data-action='choose-own-domain'>
            {t('launch_continue')}
          </Button>
        </>
      )}
    </div>
  );
}
