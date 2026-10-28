import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Spinner } from 'src/components/common/Spinner';
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import { LAUNCH_QUERY_KEY, getMockCheckout, payMockCheckout } from 'src/services/launch';
import { formatUsd } from 'src/services/pricing';

// Intentions: the stand-in for the payment provider's checkout page (/mock-checkout/<id>), while the backend runs
// with payments_mock: it shows what's being bought, and "Pay" makes the backend act as if the provider had charged
// the card (its webhooks go through the real path). The launch dialog, in the tab that opened this one, carries on
// by itself. The backend only answers for the checkout's own user, and not at all outside mock mode.

export default function MockCheckout() {
  const { t, i18n } = useTranslation();
  const checkoutId = useParams().checkoutId || '';
  const { data: checkout, isError, isLoading } = useQuery({
    queryKey: [LAUNCH_QUERY_KEY, 'mock-checkout', checkoutId],
    queryFn: () => getMockCheckout(checkoutId),
    retry: false,
  });
  const { mutate: pay, isPending, isSuccess } = useMutation({ mutationFn: () => payMockCheckout(checkoutId) });
  const item = checkout?.item;
  const what = item?.product === 'domain' ? checkout?.domain : item?.plan && t(`launch_plan_${item.plan}`);

  return (
    <div className='mx-auto flex w-full max-w-md flex-col gap-4 py-10' data-page='mock-checkout' data-checkoutid={checkoutId}>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>{t('mock_checkout_title')} <Badge variant='outline'>test</Badge></CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 text-sm'>
          <p className='text-muted-foreground'>{t('mock_checkout_note')}</p>
          {isLoading && <Spinner className='size-5 self-center' />}
          {(isError || (!isLoading && !checkout)) && !isSuccess && <p className='text-destructive'>{t('mock_checkout_not_found')}</p>}
          {checkout && (
            <>
              <div className='flex justify-between gap-3 rounded-xl border p-3'>
                <span className='font-medium'>{what}</span>
                <span>{formatUsd(checkout.price_usd || 0, i18n.language)}</span>
              </div>
              <p className='text-xs text-muted-foreground'>{checkout.email}</p>
              {isSuccess
                ? <p className='font-medium text-primary'>{t('mock_checkout_paid')}</p>
                : (
                  <Button disabled={isPending} onClick={() => pay()} data-action='mock-pay'>
                    {isPending && <Spinner data-icon='inline-start' />}
                    {t('mock_checkout_pay', { price: formatUsd(checkout.price_usd || 0, i18n.language) })}
                  </Button>
                )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
