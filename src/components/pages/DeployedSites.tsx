import { useState } from 'react';
import _ from 'lodash';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { ExternalLinkIcon, GlobeIcon, RocketIcon } from 'lucide-react';

import { Spinner } from 'src/components/common/Spinner';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent } from 'src/components/shadui/card';
import { LAUNCH_QUERY_KEY, getDeployedSites } from 'src/services/launch';
import { formatUsd } from 'src/services/pricing';
import { getSitePreviewUrl } from 'src/services/project';
import type { DeployedSite } from 'src/types/launch';
import { formatRelativeTime } from 'src/utils/common';
import { PATHS } from 'src/utils/constants';

// Dates go into translated text, and i18next's default escaping would turn a "/" in one into "&#x2F;".
const _UNESCAPED = { interpolation: { escapeValue: false } };

const _STATE_LABELS = {
  live: 'sites_state_live',
  not_servable: 'sites_state_not_servable',
  plan_ended: 'sites_state_plan_ended',
} as const;

const _DOMAIN_KIND_LABELS = {
  purchased: 'sites_domain_purchased',
  external: 'sites_domain_external',
  subdomain: 'sites_domain_subdomain',
  admin: 'sites_domain_admin',
} as const;

// The site's snapshot in a small frame, or a globe before there is one (or if it won't load).
function SitePicture({ site }: { site: DeployedSite }) {
  const [hasFailed, setHasFailed] = useState(false);
  const pictureUrl = site.site_preview_at ? getSitePreviewUrl({ id: site.project_id, site_preview_at: site.site_preview_at }) : null;

  return (
    <div className='flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-accent to-muted ring-1 ring-foreground/10 sm:w-44 sm:self-start'>
      {pictureUrl && !hasFailed
        ? <img src={pictureUrl} alt='' loading='lazy' onError={() => setHasFailed(true)} className='size-full object-cover object-top' />
        : <GlobeIcon className='size-8 text-muted-foreground' />}
    </div>
  );
}

// One label + value of a site's details. `note`: a few more words after it, in muted text ("in 3 weeks").
function SiteDetail({ label, children, note }: { label: string; children: React.ReactNode; note?: string | null }) {
  return (
    <div className='min-w-0'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-0.5 text-sm font-medium'>
        {children}
        {note && <span className='font-normal text-muted-foreground'> · {note}</span>}
      </dd>
    </div>
  );
}

// Intentions: one deployed site: what it is and where it's served, how it's doing, what it's on, when that next
// costs money or runs out, and how long it's been up. A note below says what to do when something needs the user.
function DeployedSiteCard({ site }: { site: DeployedSite }) {
  const { t, i18n } = useTranslation();
  const toDate = (date: string) => new Date(date).toLocaleDateString(i18n.language, { dateStyle: 'medium' });
  const toRelative = (date: string) => formatRelativeTime(date, i18n.language);
  const { plan, domain } = site;
  const isCancelled = !!plan?.ends_at;
  const planDate = plan?.ends_at || plan?.renews_at;
  const domainDateNote = domain.trial_ends_at
    ? t('sites_domain_free_until', { date: toDate(domain.trial_ends_at), ..._UNESCAPED })
    : domain.renews_at && t('sites_domain_renews', { date: toDate(domain.renews_at), ..._UNESCAPED });
  const notices = _.compact([
    site.state === 'plan_ended' && { key: 'plan_ended', text: t('sites_notice_plan_ended'), isUrgent: true },
    site.state === 'not_servable' && { key: 'not_servable', text: t('sites_notice_not_servable'), isUrgent: true },
    plan?.status === 'past_due' && { key: 'past_due', text: t('sites_notice_past_due'), isUrgent: true },
    plan?.ends_at && { key: 'cancelled', text: t('sites_notice_cancelled', { date: toDate(plan.ends_at), ..._UNESCAPED }), isUrgent: false },
  ]);

  return (
    <Card data-component='deployed-site' data-state={site.state} data-project={site.project_id}>
      <CardContent className='flex flex-col gap-5 sm:flex-row'>
        <SitePicture site={site} />
        <div className='flex min-w-0 flex-1 flex-col gap-4'>
          <div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-2'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='min-w-0 truncate font-heading text-lg font-semibold'>{site.name}</h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    site.state === 'live' ? 'bg-brand-light text-brand-ink' : 'bg-destructive/10 text-destructive dark:bg-destructive/20',
                  )}
                >
                  <span aria-hidden='true' className='size-1.5 rounded-full bg-current' />
                  {t(_STATE_LABELS[site.state])}
                </span>
              </div>
              <a href={site.url} target='_blank' rel='noopener noreferrer' className='mt-0.5 block truncate text-sm text-muted-foreground underline-offset-4 hover:underline'>
                {domain.domain}
              </a>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button size='sm' variant='outline' nativeButton={false} data-action='open-project' render={<Link to={`${PATHS.projects}/${site.project_id}`} />}>
                {t('sites_open_project')}
              </Button>
              <Button size='sm' nativeButton={false} data-action='visit-site' render={<a href={site.url} target='_blank' rel='noopener noreferrer' />}>
                {t('sites_visit')}
                <ExternalLinkIcon data-icon='inline-end' />
              </Button>
            </div>
          </div>
          <dl className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
            <SiteDetail
              label={t('sites_plan_label')}
              note={plan && t(`sites_price_${plan.interval}`, { price: formatUsd(plan.price_usd, i18n.language), ..._UNESCAPED })}
            >
              {plan ? t(`launch_plan_${plan.plan}`) : t('sites_no_plan')}
            </SiteDetail>
            {planDate && (
              <SiteDetail label={isCancelled ? t('sites_ends_label') : t('sites_renews_label')} note={toRelative(planDate)}>
                {toDate(planDate)}
              </SiteDetail>
            )}
            <SiteDetail label={t('sites_domain_label')} note={domainDateNote}>
              {t(_DOMAIN_KIND_LABELS[domain.kind])}
            </SiteDetail>
            <SiteDetail label={t('sites_live_since_label')} note={toRelative(site.live_since)}>
              {toDate(site.live_since)}
            </SiteDetail>
            {site.last_deployed_at && (
              <SiteDetail label={t('sites_last_deployed_label')}>{toRelative(site.last_deployed_at)}</SiteDetail>
            )}
          </dl>
          {_.map(notices, ({ key, text, isUrgent }) => (
            <p
              key={key}
              data-notice={key}
              className={cn('rounded-xl px-3 py-2 text-sm', isUrgent ? 'bg-destructive/10 text-destructive dark:bg-destructive/20' : 'bg-muted text-muted-foreground')}
            >
              {text}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Original purpose: the profile page's "Deployed sites" tab -- every site the user has online, with what it's on and
// when that renews. Paying and cancelling stay at the provider (the Account tab's billing link); changing a site's
// plan or domain stays in its project.
export default function DeployedSites() {
  const { t } = useTranslation();
  const { data: sites, isPending, isError, refetch } = useQuery({
    queryKey: [LAUNCH_QUERY_KEY, 'sites'],
    queryFn: getDeployedSites,
  });

  if (isPending) {
    return <div className='flex justify-center py-12'><Spinner className='size-6' /></div>;
  }
  if (isError) {
    return (
      <div className='flex flex-col items-center gap-3 py-12 text-center'>
        <p className='text-sm text-muted-foreground'>{t('sites_load_failed')}</p>
        <Button variant='outline' size='sm' onClick={() => refetch()}>{t('sites_try_again')}</Button>
      </div>
    );
  }
  if (_.isEmpty(sites)) {
    return (
      <Card data-component='deployed-sites-empty'>
        <CardContent className='flex flex-col items-center gap-3 py-8 text-center'>
          <span className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-brand-strong'>
            <RocketIcon className='size-5' />
          </span>
          <h2 className='font-heading text-lg font-semibold'>{t('sites_empty_title')}</h2>
          <p className='max-w-sm text-sm text-muted-foreground'>{t('sites_empty_description')}</p>
          <Button variant='outline' size='sm' nativeButton={false} render={<Link to={PATHS.projects} />}>{t('sites_empty_action')}</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div data-component='deployed-sites' className='flex flex-col gap-4'>
      {_.map(sites, site => <DeployedSiteCard key={site.project_id} site={site} />)}
    </div>
  );
}
