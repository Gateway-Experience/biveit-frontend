import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useNotification } from 'src/components/common/NotificationProvider';
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { ADMIN_QUERY_KEY, getSandboxMode, setSandboxMode } from 'src/services/admin';

// Intentions: the admin's switch for their OWN purchases between live and sandbox mode -- test payments (card
// 4242 4242 4242 4242) and domains registered on the registrar's sandbox, together. Either way round: sandbox on a
// live server to try the launch flow without spending, live on a sandbox server to try it for real before everyone
// else. Without a choice of their own they follow the server's default, like every other user.

export default function SandboxMode() {
  const queryClient = useQueryClient();
  const notify = useNotification();
  const queryKey = [ADMIN_QUERY_KEY, 'sandbox-mode'];
  const { data: mode } = useQuery({ queryKey, queryFn: getSandboxMode, staleTime: 0 });
  const { mutate: setSandbox, isPending } = useMutation({
    mutationFn: setSandboxMode,
    onSuccess: updated => queryClient.setQueryData(queryKey, updated),
    onError: () => notify('error', 'Couldn’t switch sandbox mode'),
  });

  return (
    <Card size='sm' data-section='sandbox-mode'>
      <CardHeader>
        <CardTitle>Sandbox mode</CardTitle>
        <CardAction className='flex gap-2'>
          {mode && mode.sandbox !== null && (
            <Button variant='ghost' size='sm' disabled={isPending} onClick={() => setSandbox(null)} data-action='follow-server'>
              Use server default
            </Button>
          )}
          {mode && (
            <Button variant='outline' size='sm' disabled={isPending} onClick={() => setSandbox(!mode.effective)} data-action='toggle-sandbox'>
              {mode.effective ? 'Switch to live' : 'Switch to sandbox'}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className='flex flex-col gap-1 text-sm'>
        {mode && (
          <>
            <p>
              Your purchases are{' '}
              <Badge variant={mode.effective ? 'outline' : 'default'}>{mode.effective ? 'Sandbox: test payments, sandbox domains' : 'Live: real money, real domains'}</Badge>
              {' '}{mode.sandbox === null ? '(the server’s default)' : '(your own choice)'}
            </p>
            <p className='text-muted-foreground'>
              The server’s default is {mode.server_sandbox ? 'sandbox' : 'live'}: every user without a choice of their own gets it.
              Purchases already made stay where they were made.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
