import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import Modal from 'src/components/common/Modal';
import { useNotification } from 'src/components/common/NotificationProvider';
import StatusSections from 'src/components/pages/admin/StatusSections';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/common/Spinner';
import { ADMIN_QUERY_KEY, getProjectStatus, stopProject } from 'src/services/admin';
import { PATHS } from 'src/utils/constants';

// Intentions: one project in the admin dashboard (/admin/projects/<id>) -- its status sections (workspace,
// the agent's session, container, dev servers, data), the same ones `scripts.manage status <id>` prints --
// and turning it off. Stopping takes down its runners, dev servers and container; nothing on disk is
// touched, and the owner opening the project brings it all back. English only, like the rest of /admin.

export default function AdminProjectDetail() {
  const projectId = Number(useParams().projectId);
  const notify = useNotification();
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);
  const { data: status, isFetching, isError, refetch } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'project', projectId],
    queryFn: () => getProjectStatus(projectId),
    staleTime: 0,
  });
  const { mutate: stop, isPending: isStopping } = useMutation({
    mutationFn: () => stopProject(projectId),
    onSuccess: () => {
      notify('success', `Project ${projectId} stopped`);
      setIsConfirmingStop(false);
      refetch();
    },
    onError: () => notify('error', `Couldn't stop project ${projectId}`),
  });

  return (
    <div className='flex flex-col gap-6' data-page='admin-project' data-projectid={projectId}>
      <Link to={PATHS.admin} className='text-sm text-muted-foreground hover:underline'>← Admin</Link>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>
          {status ? `${status.project.name}` : `Project ${projectId}`}
          <span className='ml-2 font-mono text-base text-muted-foreground'>#{projectId}</span>
        </h1>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching} data-action='refresh'>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant='destructive' size='sm' onClick={() => setIsConfirmingStop(true)} disabled={!status} data-action='stop'>
            Stop project
          </Button>
        </div>
      </div>

      {isError && <p className='text-sm text-destructive'>Couldn’t read this project’s status (does it exist?).</p>}
      {status && <StatusSections sections={status.sections} />}

      <Modal
        open={isConfirmingStop}
        onClose={() => !isStopping && setIsConfirmingStop(false)}
        title={`Stop project ${projectId}?`}
        fullScreenMobile={false}
        buttons={[
          <Button key='cancel' variant='outline' disabled={isStopping} onClick={() => setIsConfirmingStop(false)}>Cancel</Button>,
          <Button key='stop' variant='destructive' disabled={isStopping} onClick={() => stop()}>
            {isStopping && <Spinner data-icon='inline-start' />}
            Stop it
          </Button>,
        ]}
      >
        <p className='text-sm'>
          This turns off its agents’ sessions, its dev servers and its container. Anyone mid-chat loses the agent
          until they open the project again, which brings it all back. Nothing on disk is touched.
        </p>
      </Modal>
    </div>
  );
}
