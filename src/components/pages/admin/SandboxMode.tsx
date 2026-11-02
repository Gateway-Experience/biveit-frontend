import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useNotification } from 'src/components/common/NotificationProvider';
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { ADMIN_QUERY_KEY, getSandboxMode, setSandboxMode } from 'src/services/admin';

// Intentions: the admin's switch for their OWN purchases between live and sandbox mode -- test payments (card
// 4242 4242 4242 4242) and domains registered on the registrar's sandbox, together -- to try the launch flow end to
// end on prod without spending. Everyone else follows the server's mode.

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
        <CardAction>
          {mode && !mode.server_sandbox && (
            <Button variant='outline' size='sm' disabled={isPending} onClick={() => setSandbox(!mode.sandbox)} data-action='toggle-sandbox'>
              {mode.sandbox ? 'Back to live' : 'Switch to sandbox'}
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
            </p>
            <p className='text-muted-foreground'>
              {mode.server_sandbox
                ? 'This server is in sandbox mode, so everyone’s purchases are.'
                : 'Everyone else’s are live. Purchases already made stay where they were made.'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
