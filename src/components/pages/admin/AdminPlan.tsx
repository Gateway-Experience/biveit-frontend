import _ from 'lodash';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import Modal from 'src/components/common/Modal';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { Input } from 'src/components/shadui/input';
import { ADMIN_QUERY_KEY, deleteProjectPlan, getProjectPlan, saveProjectPlan } from 'src/services/admin';
import type { AdminPlanName, ProjectPlan } from 'src/types/admin';

// Intentions: a project's plan on its admin page. With none (or after deleting it), the admin can give it one by hand:
// monthly / yearly / one-time, from (now by default) to (from + the plan's period by default -- it follows from and
// the plan until the admin edits it). One set here can be edited or deleted; a bought one (Polar) can only be
// deleted, and deleting it doesn't stop Polar charging -- that's cancelled in Polar's dashboard. English only, like
// the rest of /admin.

const PLAN_LABELS: Record<AdminPlanName, string> = { monthly: 'Monthly', yearly: 'Yearly', one_time: 'One-time' };

// The default length of each plan. One-time: the agent access a bought one gives (the BE's PLANS edit_days).
const _addPeriod = (date: Date, plan: AdminPlanName) => {
  const next = new Date(date);
  if (plan === 'monthly') next.setMonth(next.getMonth() + 1);
  if (plan === 'yearly') next.setFullYear(next.getFullYear() + 1);
  if (plan === 'one_time') next.setDate(next.getDate() + 30);
  return next;
};

// <input type='datetime-local'> works in the browser's local time, without seconds: 'YYYY-MM-DDTHH:mm'.
const _toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const _formatDate = (date: string | null) => (date ? new Date(date).toLocaleString() : '—');

const _describeState = (plan: ProjectPlan) => {
  const now = Date.now();
  if (new Date(plan.created_at).getTime() > now) return 'starts later';
  if (plan.provider === 'admin') return plan.ends_at && new Date(plan.ends_at).getTime() <= now ? 'ended' : 'running';
  return plan.status;
};

export default function AdminPlan({ projectId }: { projectId: number }) {
  const notify = useNotification();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'project', projectId, 'plan'],
    queryFn: () => getProjectPlan(projectId),
    staleTime: 0,
  });
  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteProjectPlan(projectId),
    onSuccess: () => {
      notify('success', 'Plan deleted');
      setIsConfirmingDelete(false);
      refetch();
    },
    onError: error => notify('error', `Couldn't delete the plan: ${_.get(error, 'data.detail', 'request failed')}`),
  });
  if (!data) {
    return null;
  }

  const { plan } = data;
  const isBought = Boolean(plan && plan.provider !== 'admin');

  return (
    <Card size='sm' data-section='plan'>
      <CardHeader>
        <CardTitle>Plan</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {plan ? (
          <div className='flex flex-wrap items-center gap-2 text-sm' data-plan-provider={plan.provider}>
            <span className='font-medium'>{PLAN_LABELS[plan.plan] ?? plan.plan}</span>
            <Badge variant={isBought ? 'default' : 'secondary'}>{isBought ? `bought (${plan.provider})` : 'set by admin'}</Badge>
            <Badge variant='outline'>{_describeState(plan)}</Badge>
            <span className='text-muted-foreground'>
              {_formatDate(plan.created_at)} → {_formatDate(plan.ends_at ?? plan.renews_at)}
              {plan.renews_at && !plan.ends_at && ' (renews)'}
            </span>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>No plan. Give it one:</p>
        )}

        {!isBought && <PlanForm key={plan ? `${plan.id}-${plan.plan}-${plan.created_at}-${plan.ends_at}` : 'new'} projectId={projectId} plan={plan} onSaved={refetch} />}
        {isBought && (
          <p className='text-xs text-muted-foreground'>
            Bought through Polar, so it can only be deleted here. Deleting it takes the project’s access away but
            doesn’t stop the billing: cancel or refund it in Polar’s dashboard for that.
          </p>
        )}
        {plan && (
          <div>
            <Button variant='destructive' size='sm' onClick={() => setIsConfirmingDelete(true)} data-action='delete-plan'>
              Delete plan
            </Button>
          </div>
        )}
      </CardContent>

      <Modal
        open={isConfirmingDelete}
        onClose={() => !isDeleting && setIsConfirmingDelete(false)}
        title='Delete this plan?'
        fullScreenMobile={false}
        buttons={[
          <Button key='cancel' variant='outline' disabled={isDeleting} onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>,
          <Button key='delete' variant='destructive' disabled={isDeleting} onClick={() => remove()}>
            {isDeleting && <Spinner data-icon='inline-start' />}
            Delete it
          </Button>,
        ]}
      >
        <p className='text-sm'>
          The project loses what the plan gave it right away, with no grace period. The row is kept (soft-deleted).
          {isBought && ' Polar keeps charging the customer until it is cancelled in Polar.'}
        </p>
      </Modal>
    </Card>
  );
}

// The plan's fields: prefilled from an admin-set plan (editing it), or the defaults (giving one).
function PlanForm({ projectId, plan, onSaved }: { projectId: number; plan: ProjectPlan | null; onSaved: () => void }) {
  const notify = useNotification();
  const [planName, setPlanName] = useState<AdminPlanName>(plan?.plan ?? 'monthly');
  const [startsAt, setStartsAt] = useState(() => _toLocalInput(plan ? new Date(plan.created_at) : new Date()));
  // null = untouched: `to` is from + the plan's period until the admin edits it.
  const [editedEndsAt, setEditedEndsAt] = useState<string | null>(plan?.ends_at ? _toLocalInput(new Date(plan.ends_at)) : null);
  const endsAt = editedEndsAt ?? _toLocalInput(_addPeriod(new Date(startsAt), planName));
  const isPeriodValid = Boolean(startsAt && endsAt) && new Date(endsAt).getTime() > new Date(startsAt).getTime();
  const { mutate: save, isPending } = useMutation({
    mutationFn: () => saveProjectPlan(
      projectId,
      { plan: planName, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString() },
      !plan,
    ),
    onSuccess: () => {
      notify('success', plan ? 'Plan updated' : 'Plan set');
      onSaved();
    },
    onError: error => notify('error', `Couldn't save the plan: ${_.get(error, 'data.detail', 'request failed')}`),
  });

  return (
    <form
      className='flex flex-col gap-2'
      onSubmit={event => {
        event.preventDefault();
        save();
      }}
    >
      <div className='flex flex-wrap items-end gap-2'>
        <label className='flex flex-col gap-1 text-xs text-muted-foreground'>
          Plan
          <select value={planName} onChange={event => setPlanName(event.target.value as AdminPlanName)} className='h-11 rounded-lg border border-input bg-card px-2 text-sm text-foreground' data-input='plan'>
            {_.map(PLAN_LABELS, (label, name) => <option key={name} value={name}>{label}</option>)}
          </select>
        </label>
        <label className='flex flex-col gap-1 text-xs text-muted-foreground'>
          From
          <Input type='datetime-local' value={startsAt} onChange={event => setStartsAt(event.target.value)} className='w-52' data-input='plan-from' />
        </label>
        <label className='flex flex-col gap-1 text-xs text-muted-foreground'>
          To
          <Input type='datetime-local' value={endsAt} onChange={event => setEditedEndsAt(event.target.value)} className='w-52' data-input='plan-to' />
        </label>
        <Button type='submit' size='sm' disabled={isPending || !isPeriodValid} data-action='save-plan'>
          {isPending && <Spinner data-icon='inline-start' />}
          {plan ? 'Update plan' : 'Set plan'}
        </Button>
        {editedEndsAt !== null && (
          <Button variant='ghost' size='sm' onClick={() => setEditedEndsAt(null)}>“To” = from + period</Button>
        )}
      </div>
      {!isPeriodValid && <p className='text-xs text-destructive'>“To” has to be after “from”.</p>}
      <p className='text-xs text-muted-foreground'>Times are in your browser’s timezone; they’re stored as UTC.</p>
    </form>
  );
}
