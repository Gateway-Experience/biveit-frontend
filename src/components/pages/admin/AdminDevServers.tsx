import _ from 'lodash';
import { useMutation } from '@tanstack/react-query';

import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { startDevServers } from 'src/services/admin';
import type { AdminDevenv } from 'src/types/admin';

// Intentions: a project's dev environment on its admin page -- the dev site's link and the two dev servers' states,
// plus a way to bring them back up once they're down. Starting is only enabled for a built project (preview_url is
// null until there's an app to run) whose servers aren't both online. The BE starts them in the background, so the
// page polls while devenv.busy (see AdminProjectDetail) and calls onStarted to kick that off.

type Props = { projectId: number; devenv: AdminDevenv; onStarted: () => void };

export default function AdminDevServers({ projectId, devenv, onStarted }: Props) {
  const notify = useNotification();
  const { mutate: start, isPending: isStarting } = useMutation({
    mutationFn: () => startDevServers(projectId),
    onSuccess: () => {
      notify('success', 'Starting the dev servers…');
      onStarted();
    },
    onError: error => notify('error', `Couldn't start the dev servers: ${_.get(error, 'data.detail', 'request failed')}`),
  });
  const isBuilt = !_.isNil(devenv.preview_url);
  const isAllOnline = !_.isEmpty(devenv.servers) && _.every(devenv.servers, { status: 'online' });

  return (
    <Card size='sm' data-section='dev-servers'>
      <CardHeader>
        <CardTitle>Dev environment</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4 text-sm'>
        <dl className='grid grid-cols-[minmax(8rem,max-content)_1fr] gap-x-4 gap-y-1.5'>
          <dt className='text-muted-foreground'>dev site</dt>
          <dd className='font-mono text-xs leading-5'>
            {isBuilt
              ? <a href={devenv.preview_url!} target='_blank' rel='noreferrer' className='text-primary hover:underline' data-link='dev-site'>{devenv.preview_url}</a>
              : 'not built yet'}
          </dd>
          {_.map(devenv.servers, server => (
            <div key={server.app} className='contents'>
              <dt className='text-muted-foreground'>{server.app}</dt>
              <dd className='font-mono text-xs leading-5' data-server={server.app} data-status={server.status}>{server.status}</dd>
            </div>
          ))}
        </dl>
        <div>
          <Button
            size='sm'
            onClick={() => start()}
            disabled={!isBuilt || isAllOnline || isStarting || devenv.busy}
            data-action='start-dev-servers'
          >
            {(isStarting || devenv.busy) && <Spinner data-icon='inline-start' />}
            {devenv.busy ? 'Starting…' : 'Start dev servers'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
