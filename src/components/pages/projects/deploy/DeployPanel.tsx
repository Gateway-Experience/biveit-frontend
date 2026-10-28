import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { RocketIcon } from 'lucide-react';

import { useNotification } from 'src/components/common/NotificationProvider';
import PlanList from 'src/components/common/PlanList';
import { Button } from 'src/components/shadui/button';
import { DialogDescription, DialogTitle } from 'src/components/shadui/dialog';
import { PATHS } from 'src/utils/constants';

// TODO: there's no payment/deployment API yet. Wire the button once there is.

// The celebration's blocks come in one after another, once the pop-up itself has risen into place.
// `both` keeps each one hidden during its delay instead of flashing in first.
const _ENTER_CLASS = 'animate-in fade-in-0 slide-in-from-bottom-3 duration-500 ease-out [animation-fill-mode:both]';

// [Pure]
function _getEnterStyle(order: number) {
  return { animationDelay: `${200 + order * 90}ms` };
}

// Original purpose: offering payment/deployment once the user has signed off the built site
// (build_approved_at).
// `variant`: 'tab' is the steady Deploy tab. 'celebration' is the pop-up at the moment of sign-off: roomier,
// headlined "Your site is ready!", and animated in — and it must sit inside a dialog, since its headline
// and pitch become the dialog's title and description.
// Fills whatever box it's given; scrolls when it's taller.
export default function DeployPanel({ variant = 'tab', onShowCelebration, className }: {
  variant?: 'tab' | 'celebration';
  // TODO: testing aid — opens the "your site is ready" pop-up on demand. Remove once it's been signed off.
  onShowCelebration?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const isCelebration = variant === 'celebration';
  // Each block's entrance, only when celebrating.
  const enter = (order: number) => (isCelebration ? { className: _ENTER_CLASS, style: _getEnterStyle(order) } : {});
  const Title = isCelebration ? DialogTitle : 'h2';
  const Description = isCelebration ? DialogDescription : 'p';

  return (
    <div data-component='deploy-panel' data-variant={variant} className={cn('min-h-0 overflow-y-auto', className)}>
      <div className={cn('mx-auto flex w-full max-w-md flex-col', isCelebration ? 'gap-7 px-6 pt-12 pb-10 sm:px-10' : 'gap-5 px-4 py-8')}>
        <div className='text-center'>
          <div
            className={cn(
              'mx-auto flex items-center justify-center bg-primary text-primary-foreground',
              isCelebration
                ? 'mb-5 size-16 rounded-3xl shadow-lg animate-in fade-in-0 zoom-in-50 spin-in-12 duration-500 ease-out [animation-fill-mode:both] [animation-delay:150ms]'
                : 'mb-4 size-12 rounded-2xl',
            )}
          >
            <RocketIcon className={isCelebration ? 'size-8' : 'size-6'} />
          </div>
          <div {...enter(1)}>
            <Title className={cn('font-heading font-bold tracking-[-0.02em]', isCelebration ? 'text-3xl' : 'text-xl')}>
              {t(isCelebration ? 'deploy_ready_title' : 'deploy_title')}
            </Title>
            <Description className={cn('text-muted-foreground', isCelebration ? 'mt-3 text-base' : 'mt-1.5 text-sm')}>
              {t('deploy_body')}
            </Description>
          </div>
        </div>

        <div {...enter(2)}>
          <div className='rounded-2xl border bg-card p-5'>
            <PlanList />
            {/* TODO: no payment/deployment API yet — this only says so. */}
            <Button size='lg' className='mt-5 w-full' onClick={() => notify('info', t('deploy_coming_soon'))}>
              {t('deploy_cta')}
            </Button>
            {/* A new tab: this sits in the project workspace (or its celebration pop-up), which shouldn't be left. */}
            <Link to={PATHS.pricing} target='_blank' className='mt-3 block text-center text-xs text-muted-foreground hover:text-foreground hover:underline'>
              {t('pricing_see_details')}
            </Link>
          </div>
        </div>

        {onShowCelebration && (
          <Button variant='link' size='sm' className='self-center text-muted-foreground' onClick={onShowCelebration}>
            {t('deploy_test_show_popup')}
          </Button>
        )}
      </div>
    </div>
  );
}
