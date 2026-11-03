import { useState } from 'react';
import _ from 'lodash';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';

import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { ADMIN_QUERY_KEY, getAiCostReport, getProjectAiCost } from 'src/services/admin';
import type { AiCostSeries } from 'src/types/admin';
import { PATHS } from 'src/utils/constants';

// Intentions: what the agents cost us (/admin/ai-usage) -- per user and per project over a range, read from the
// backend's ai_usage table at today's prices. Clicking a project charts its cost per hour (ranges up to 2 days) or
// per day. An operator's page, so English only (no i18n). Days are UTC days, as the backend buckets them.

const _RANGES = [
  { key: '24h', label: 'Last 24 hours', hours: 24 },
  { key: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { key: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { key: '90d', label: 'Last 90 days', hours: 24 * 90 },
];

// [Pure] The range ending now, as ISO strings. Recomputed only when a range is picked, so the queries keep one key.
function toRange(hours: number) {
  const until = new Date();
  return { since: new Date(until.getTime() - hours * 3600_000).toISOString(), until: until.toISOString() };
}

// [Pure] Small amounts get more decimals: most calls cost a fraction of a cent.
function formatUsd(amount: number) {
  return `$${amount.toFixed(amount >= 1 ? 2 : amount >= 0.01 ? 3 : 4)}`;
}

// [Pure] A bar's label: its hour in the viewer's time, or its UTC day.
function formatBucket(at: string, bucket: AiCostSeries['bucket']) {
  const date = new Date(at);
  return bucket === 'hour'
    ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function CostChart({ series }: { series: AiCostSeries }) {
  const highest = _.max(_.map(series.points, 'cost_usd')) || 0;
  // A label under every bar would overlap; a handful spread along the axis is enough.
  const labelEvery = Math.max(1, Math.ceil(_.size(series.points) / 8));
  return (
    <div className='flex flex-col gap-2' data-chart={series.bucket}>
      <div className='flex h-48 items-end gap-px border-b'>
        {_.map(series.points, point => (
          <div
            key={point.at}
            className='group relative flex h-full flex-1 items-end'
            title={`${formatBucket(point.at, series.bucket)}: ${formatUsd(point.cost_usd)}`}
          >
            <div
              className={cn('w-full rounded-t-sm bg-primary/80 group-hover:bg-primary', point.cost_usd > 0 && 'min-h-px')}
              style={{ height: highest ? `${(point.cost_usd / highest) * 100}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className='flex gap-px text-[10px] text-muted-foreground'>
        {_.map(series.points, (point, index) => (
          <div key={point.at} className='flex-1 overflow-visible whitespace-nowrap'>
            {index % labelEvery === 0 ? formatBucket(point.at, series.bucket) : ''}
          </div>
        ))}
      </div>
      <p className='text-xs text-muted-foreground'>
        Per {series.bucket}{series.bucket === 'day' ? ' (UTC days)' : ''}, highest {formatUsd(highest)}. Hover a bar for its cost.
      </p>
    </div>
  );
}

function ProjectChart({ projectId, name, range }: { projectId: number; name: string; range: { since: string; until: string } }) {
  const { data: series, isError } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'ai-usage', 'project', projectId, range],
    queryFn: () => getProjectAiCost(projectId, range.since, range.until),
  });
  return (
    <Card size='sm' data-section='project-chart'>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && <p className='text-sm text-destructive'>Couldn’t load this project’s usage.</p>}
        {series ? <CostChart series={series} /> : !isError && <p className='text-sm text-muted-foreground'>Loading…</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminAiUsage() {
  const [rangeKey, setRangeKey] = useState('7d');
  const [range, setRange] = useState(() => toRange(24 * 7));
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { data: report, isFetching, isError } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'ai-usage', range],
    queryFn: () => getAiCostReport(range.since, range.until),
  });
  const selectedProject = _.find(report?.projects, { project_id: selectedProjectId ?? undefined });

  const pickRange = (key: string, hours: number) => {
    setRangeKey(key);
    setRange(toRange(hours));
  };

  return (
    <div className='flex flex-col gap-6' data-page='admin-ai-usage'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <Link to={PATHS.admin} className='text-sm text-primary hover:underline'>← Admin</Link>
          <h1 className='text-2xl font-semibold'>AI usage</h1>
        </div>
        <div className='flex flex-wrap gap-2'>
          {_.map(_RANGES, ({ key, label, hours }) => (
            <Button
              key={key}
              size='sm'
              variant={rangeKey === key ? 'default' : 'outline'}
              onClick={() => pickRange(key, hours)}
              data-range={key}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isError && <p className='text-sm text-destructive'>Couldn’t load the usage.</p>}

      <Card size='sm' data-section='total'>
        <CardContent className='flex items-baseline gap-3'>
          <span className='text-sm text-muted-foreground'>Total</span>
          <span className='font-mono text-2xl font-semibold tabular-nums'>{report ? formatUsd(report.total_usd) : '…'}</span>
          {isFetching && <span className='text-xs text-muted-foreground'>refreshing…</span>}
          <span className='ml-auto text-xs text-muted-foreground'>At today’s prices (system config)</span>
        </CardContent>
      </Card>

      {selectedProject && (
        <ProjectChart
          key={selectedProject.project_id}
          projectId={selectedProject.project_id}
          name={`${selectedProject.name ?? `Project #${selectedProject.project_id}`} — ${selectedProject.user_name}`}
          range={range}
        />
      )}

      <Card size='sm' data-section='projects'>
        <CardHeader>
          <CardTitle>Projects ({_.size(report?.projects)})</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='text-left text-muted-foreground'>
              <tr className='border-b'>
                <th className='py-2 pr-4 font-medium'>ID</th>
                <th className='py-2 pr-4 font-medium'>Project</th>
                <th className='py-2 pr-4 font-medium'>Owner</th>
                <th className='py-2 text-right font-medium'>Cost</th>
              </tr>
            </thead>
            <tbody>
              {_.map(report?.projects, project => (
                <tr
                  key={project.project_id}
                  className={cn('cursor-pointer border-b last:border-0 hover:bg-muted/50', project.project_id === selectedProjectId && 'bg-muted')}
                  onClick={() => setSelectedProjectId(project.project_id)}
                  data-projectid={project.project_id}
                >
                  <td className='py-2 pr-4 font-mono'>{project.project_id}</td>
                  <td className='py-2 pr-4 font-medium text-primary'>{project.name ?? `Project #${project.project_id}`}</td>
                  <td className='py-2 pr-4'>{project.user_name}</td>
                  <td className='py-2 text-right font-mono tabular-nums'>{formatUsd(project.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report && _.isEmpty(report.projects) && <p className='py-4 text-sm text-muted-foreground'>No usage in this range.</p>}
        </CardContent>
      </Card>

      <Card size='sm' data-section='users'>
        <CardHeader>
          <CardTitle>Users ({_.size(report?.users)})</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='text-left text-muted-foreground'>
              <tr className='border-b'>
                <th className='py-2 pr-4 font-medium'>ID</th>
                <th className='py-2 pr-4 font-medium'>User</th>
                <th className='py-2 pr-4 font-medium'>Projects</th>
                <th className='py-2 text-right font-medium'>Cost</th>
              </tr>
            </thead>
            <tbody>
              {_.map(report?.users, user => (
                <tr key={user.user_id} className='border-b last:border-0' data-userid={user.user_id}>
                  <td className='py-2 pr-4 font-mono'>{user.user_id}</td>
                  <td className='py-2 pr-4'>{user.name}</td>
                  <td className='py-2 pr-4'>{user.project_count}</td>
                  <td className='py-2 text-right font-mono tabular-nums'>{formatUsd(user.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
