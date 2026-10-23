import _ from 'lodash';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import ServerUsage from 'src/components/pages/admin/ServerUsage';
import StatusSections from 'src/components/pages/admin/StatusSections';
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { ADMIN_QUERY_KEY, getPlatformStatus } from 'src/services/admin';
import { PATHS } from 'src/utils/constants';

// Intentions: the admin home (/admin) -- the machine's usage (live), every project with whether its
// container runs (click one for its details), and the platform's status sections. An operator's page, so
// it's English only (no i18n). The status sections are read on demand: gathering them asks docker and every
// runner, so they refresh with the button, not on a timer.

export default function AdminDashboard() {
  const { data: platform, isFetching, isError, refetch } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'platform'],
    queryFn: getPlatformStatus,
    staleTime: 0,
  });
  const projects = _.orderBy(platform?.projects, ['is_running', 'updated_at'], ['desc', 'desc']);

  return (
    <div className='flex flex-col gap-6' data-page='admin-dashboard'>
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>Admin</h1>
        <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching} data-action='refresh'>
          {isFetching ? 'Refreshing…' : 'Refresh status'}
        </Button>
      </div>

      <ServerUsage />

      {isError && <p className='text-sm text-destructive'>Couldn’t read the platform’s status.</p>}

      <Card size='sm' data-section='projects'>
        <CardHeader>
          <CardTitle>Projects ({_.size(projects)})</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='text-left text-muted-foreground'>
              <tr className='border-b'>
                <th className='py-2 pr-4 font-medium'>ID</th>
                <th className='py-2 pr-4 font-medium'>Name</th>
                <th className='py-2 pr-4 font-medium'>Owner</th>
                <th className='py-2 pr-4 font-medium'>Stage</th>
                <th className='py-2 pr-4 font-medium'>Container</th>
                <th className='py-2 font-medium'>Edited</th>
              </tr>
            </thead>
            <tbody>
              {_.map(projects, project => (
                <tr key={project.id} className='border-b last:border-0 hover:bg-muted/50' data-projectid={project.id}>
                  <td className='py-2 pr-4 font-mono'>{project.id}</td>
                  <td className='py-2 pr-4'>
                    <Link to={`${PATHS.admin}/projects/${project.id}`} className='font-medium text-primary hover:underline'>
                      {project.name}
                    </Link>
                  </td>
                  <td className='py-2 pr-4'>{project.owner.username ?? `guest #${project.owner.id}`}</td>
                  <td className='py-2 pr-4'>{project.stage}</td>
                  <td className='py-2 pr-4'>
                    <Badge variant={project.is_running ? 'default' : 'outline'}>{project.is_running ? 'running' : 'stopped'}</Badge>
                  </td>
                  <td className='py-2 text-muted-foreground'>{new Date(project.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {platform && <StatusSections sections={platform.sections} />}
    </div>
  );
}
