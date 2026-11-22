import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import Modal from 'src/components/common/Modal';
import { useNotification } from 'src/components/common/NotificationProvider';
import AdminDeployments from 'src/components/pages/admin/AdminDeployments';
import AdminDevServers from 'src/components/pages/admin/AdminDevServers';
import AdminPlan from 'src/components/pages/admin/AdminPlan';
import StatusSections from 'src/components/pages/admin/StatusSections';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/common/Spinner';
import { ADMIN_QUERY_KEY, getProjectStatus, startProject, stopProject } from 'src/services/admin';
import { PATHS } from 'src/utils/constants';

// Intentions: one project in the admin dashboard (/admin/projects/<id>) -- its status sections (workspace,
// the agent's session, container, dev servers, data), the same ones `scripts.manage status <id>` prints --
// its description, a link to its chat (AdminConversation, read-only), its dev environment (AdminDevServers: the dev site's link, starting stopped servers),
// its plan (AdminPlan: setting one by hand), its production site (AdminDeployments: deploying it by hand), and turning it
// off or back on (one button, by whether its container runs). Stopping takes down its runners, dev servers and
// container; nothing on disk is touched. Starting is what the owner opening the project does, and runs in the
// background on the BE, so the page polls until the container's up (giving up after START_WAIT_MS: a failed start
// only shows in the BE's error log). English only, like the rest of /admin.

const START_WAIT_MS = 2 * 60 * 1000;

export default function AdminProjectDetail() {
  const projectId = Number(useParams().projectId);
  const notify = useNotification();
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);
  const [isStartRequested, setIsStartRequested] = useState(false);
  useEffect(() => {
    if (!isStartRequested) {
      return undefined;
    }
    const timer = setTimeout(() => setIsStartRequested(false), START_WAIT_MS);
    return () => clearTimeout(timer);
  }, [isStartRequested]);
  const { data: status, isFetching, isError, refetch } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'project', projectId],
    queryFn: () => getProjectStatus(projectId),
    staleTime: 0,
    // Intentions: keep polling while something's starting -- the project (until its container's up) or its dev servers
    refetchInterval: query => ((isStartRequested && !query.state.data?.is_running) || query.state.data?.devenv.busy ? 3000 : false),
  });
  const isProjectStarting = isStartRequested && !!status && !status.is_running;
  const { mutate: start, isPending: isStartPending } = useMutation({
    mutationFn: () => startProject(projectId),
    onSuccess: () => {
      notify('success', `Starting project ${projectId}…`);
      setIsStartRequested(true);
      refetch();
    },
    onError: () => notify('error', `Couldn't start project ${projectId}`),
  });
  const { mutate: stop, isPending: isStopping } = useMutation({
    mutationFn: () => stopProject(projectId),
    onSuccess: () => {
      notify('success', `Project ${projectId} stopped`);
      setIsConfirmingStop(false);
      setIsStartRequested(false);
      refetch();
    },
    onError: () => notify('error', `Couldn't stop project ${projectId}`),
  });

  return (
    <div className='flex flex-col gap-6' data-page='admin-project' data-projectid={projectId}>
      <Link to={PATHS.admin} className='text-sm text-muted-foreground hover:underline'>← Admin</Link>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold'>
            {status ? `${status.project.name}` : `Project ${projectId}`}
            <span className='ml-2 font-mono text-base text-muted-foreground'>#{projectId}</span>
          </h1>
          {status?.project.description && (
            <p className='max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground' data-field='description'>{status.project.description}</p>
          )}
        </div>
        <div className='flex gap-2'>
          {status && (
            <Button
              variant='outline'
              size='sm'
              nativeButton={false}
              render={<Link to={`${PATHS.admin}/projects/${projectId}/conversations/${status.conversation_id}`} />}
              data-action='view-conversation'
            >
              View conversation
            </Button>
          )}
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching} data-action='refresh'>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          {status && !status.is_running ? (
            <Button size='sm' onClick={() => start()} disabled={isStartPending || isProjectStarting} data-action='start'>
              {(isStartPending || isProjectStarting) && <Spinner data-icon='inline-start' />}
              {isProjectStarting ? 'Starting…' : 'Start project'}
            </Button>
          ) : (
            <Button variant='destructive' size='sm' onClick={() => setIsConfirmingStop(true)} disabled={!status} data-action='stop'>
              Stop project
            </Button>
          )}
        </div>
      </div>

      {isError && <p className='text-sm text-destructive'>Couldn’t read this project’s status (does it exist?).</p>}
      {status && <AdminDevServers projectId={projectId} devenv={status.devenv} onStarted={refetch} />}
      {status && <AdminPlan projectId={projectId} />}
      {status && <AdminDeployments projectId={projectId} />}
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
