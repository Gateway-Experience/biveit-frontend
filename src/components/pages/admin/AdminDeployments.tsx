import _ from 'lodash';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { Input } from 'src/components/shadui/input';
import { ADMIN_QUERY_KEY, deployProject, getProjectDeployments } from 'src/services/admin';
import type { DeploymentOutcome } from 'src/types/admin';

// Intentions: a project's production site on its admin page -- what's live, the deployment history (with every
// failed attempt's error), and deploying by hand: the domains to serve it on (empty = the default
// <hash>.<PROD_DOMAIN>), then the workspace as it is now. The rollout runs in the background (build, container,
// nginx, certificates), so the card polls while one runs. English only, like the rest of /admin.

const OUTCOME_BADGES: Record<DeploymentOutcome, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  running: 'outline',
  succeeded: 'default',
  rolled_back: 'destructive',
  failed: 'destructive',
  interrupted: 'secondary',
};

const _shortCommit = (commit: string | null | undefined) => (commit ? commit.slice(0, 12) : '—');
const _formatDate = (date: string | null | undefined) => (date ? new Date(date).toLocaleString() : '—');

export default function AdminDeployments({ projectId }: { projectId: number }) {
  const notify = useNotification();
  // null = untouched: the input shows the site's current domains until edited.
  const [domainsText, setDomainsText] = useState<string | null>(null);
  const { data: deployments, refetch } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'project', projectId, 'deployments'],
    queryFn: () => getProjectDeployments(projectId),
    staleTime: 0,
    refetchInterval: query => (query.state.data?.status.deploying ? 3000 : false),
  });
  const { mutate: deploy, isPending: isDeploying } = useMutation({
    mutationFn: (domains: string[]) => deployProject(projectId, domains),
    onSuccess: ({ commit }) => {
      notify('success', `Deploying ${_shortCommit(commit)}`);
      setDomainsText(null);
      refetch();
    },
    onError: error => notify('error', `Couldn't deploy: ${_.get(error, 'data.detail', 'request failed')}`),
  });
  if (!deployments) {
    return null;
  }

  const { status, history, default_domain: defaultDomain } = deployments;
  const shownDomainsText = domainsText ?? _.join(status.domains, ', ');
  const domains = _.compact(_.map(_.split(shownDomainsText, ','), _.trim));

  return (
    <Card size='sm' data-section='deployments'>
      <CardHeader>
        <CardTitle>Production</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4 text-sm'>
        <dl className='grid grid-cols-[minmax(8rem,max-content)_1fr] gap-x-4 gap-y-1.5'>
          <dt className='text-muted-foreground'>live</dt>
          <dd className='font-mono text-xs leading-5' data-livecommit={status.live?.commit}>
            {status.live
              ? `${_shortCommit(status.live.commit)} since ${_formatDate(status.live.deployed_at)}${status.live.running ? '' : ' -- container NOT running'}`
              : 'never deployed'}
          </dd>
          <dt className='text-muted-foreground'>undeployed changes</dt>
          <dd className='font-mono text-xs leading-5'>
            {_.isNil(status.has_undeployed_changes) ? 'can’t tell (dev container stopped)' : status.has_undeployed_changes ? 'yes' : 'no'}
          </dd>
          <dt className='text-muted-foreground'>served on</dt>
          <dd className='flex flex-col'>
            {_.isEmpty(status.urls) && <span className='font-mono text-xs leading-5'>no domains</span>}
            {_.map(status.urls, url => (
              <a key={url} href={url} target='_blank' rel='noreferrer' className='font-mono text-xs leading-5 text-primary hover:underline'>{url}</a>
            ))}
          </dd>
        </dl>

        <form className='flex flex-col gap-2' onSubmit={event => { event.preventDefault(); deploy(domains); }}>
          <div className='flex gap-2'>
            <Input
              value={shownDomainsText}
              onChange={event => setDomainsText(event.target.value)}
              placeholder={defaultDomain ?? 'myshop.com, www.myshop.com'}
              data-input='domains'
            />
            <Button type='submit' disabled={isDeploying || status.deploying} data-action='deploy'>
              {(isDeploying || status.deploying) && <Spinner data-icon='inline-start' />}
              {status.deploying ? 'Deploying…' : 'Deploy'}
            </Button>
          </div>
          <p className='text-xs text-muted-foreground'>
            Comma-separated; they replace the site’s current domains. Empty = {defaultDomain ?? 'the default domain (none: PROD_DOMAIN isn’t set)'}.
            A domain of ours needs nothing else; any other one needs its A record pointing at the server first.
          </p>
        </form>

        {!_.isEmpty(history) && (
          <table className='w-full text-xs'>
            <thead className='text-left text-muted-foreground'>
              <tr className='border-b'>
                <th className='py-2 pr-4 font-medium'>Started</th>
                <th className='py-2 pr-4 font-medium'>Commit</th>
                <th className='py-2 pr-4 font-medium'>Outcome</th>
                <th className='py-2 font-medium'>Errors</th>
              </tr>
            </thead>
            <tbody>
              {_.map(history, deployment => (
                <tr key={deployment.id} className='border-b align-top last:border-0' data-deploymentid={deployment.id}>
                  <td className='py-2 pr-4 whitespace-nowrap'>{_formatDate(deployment.started_at)}</td>
                  <td className='py-2 pr-4 font-mono'>{_shortCommit(deployment.commit)}</td>
                  <td className='py-2 pr-4'>
                    <Badge variant={OUTCOME_BADGES[deployment.outcome]}>{_.replace(deployment.outcome, '_', ' ')}</Badge>
                    {deployment.outcome === 'rolled_back' && (
                      <div className='mt-1 font-mono text-muted-foreground'>live: {_shortCommit(deployment.live_commit)}</div>
                    )}
                  </td>
                  <td className='py-2'>
                    {_.map(deployment.attempts, attempt => (
                      <details key={`${attempt.attempt}-${attempt.at}`} data-attempt={attempt.attempt}>
                        <summary className='cursor-pointer text-destructive'>attempt {attempt.attempt ?? '?'} failed</summary>
                        <pre className='mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground'>{attempt.error}</pre>
                      </details>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
