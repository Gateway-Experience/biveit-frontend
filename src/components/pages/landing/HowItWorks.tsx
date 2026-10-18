import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowRightIcon, LockIcon } from 'lucide-react';
import { cn } from 'cn';

import Reveal from 'src/components/common/Reveal';
import { BrowserDots, ChatPreviewCard } from 'src/components/pages/landing/ProductSnippets';

const _STEPS = [
  { id: 'talk', titleKey: 'landing_step1_title', descKey: 'landing_step1_body' },
  { id: 'build', titleKey: 'landing_step2_title', descKey: 'landing_step2_body' },
  { id: 'live', titleKey: 'landing_step3_title', descKey: 'landing_step3_body' },
];

// The picture in each step's frame: a little piece of the product at that stage.
function TalkVisual() {
  return <ChatPreviewCard className='w-[300px] shrink-0 -translate-y-3 scale-[0.78] shadow-xl' />;
}

function BuildVisual() {
  return (
    <div className='w-60 overflow-hidden rounded-xl border bg-card shadow-xl'>
      <div className='border-b px-2.5 py-2'><BrowserDots /></div>
      <div className='flex flex-col gap-2 p-3'>
        <div className='h-12 rounded-lg bg-linear-to-r from-highlight to-chart-2' />
        <div className='grid grid-cols-3 gap-2'>
          {[0, 1, 2].map(index => <div key={index} className='h-9 rounded-md bg-muted' />)}
        </div>
        <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
          <div className='h-full w-3/4 rounded-full bg-linear-to-r from-brand-light to-brand-deep' />
        </div>
      </div>
    </div>
  );
}

function LiveVisual() {
  const { t } = useTranslation();
  return (
    <div className='flex flex-col items-center gap-3'>
      <span className='flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-semibold shadow-xl'>
        <LockIcon className='size-4 text-success' />
        {t('landing_example_domain_moto')}
      </span>
      <span className='flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success'>
        <span className='size-1.5 rounded-full bg-success' />
        {t('landing_scene_live')}
      </span>
    </div>
  );
}

const _STEP_VISUALS: Record<string, () => React.ReactNode> = { talk: TalkVisual, build: BuildVisual, live: LiveVisual };

// One step: its number and title over a frame with the picture. Hovering the frame (or focusing it, which is
// also what a tap does on phones) slides the step's explanation up over the picture, like the reference's cards.
function StepFrame({ step, index }: { step: typeof _STEPS[number]; index: number }) {
  const { t } = useTranslation();
  const StepVisual = _STEP_VISUALS[step.id];

  return (
    <div data-stepid={step.id} className='flex min-w-0 flex-col gap-3'>
      <p className='flex items-baseline gap-2 font-heading'>
        <span className='text-sm font-bold text-brand-strong'>{`0${index + 1}`}</span>
        <span className='text-xl font-bold tracking-[-0.02em]'>{t(step.titleKey)}</span>
      </p>
      <div
        tabIndex={0}
        aria-describedby={`step-details-${step.id}`}
        className='group/step relative isolate grid h-80 cursor-default place-items-center overflow-hidden rounded-3xl border bg-linear-to-br from-accent via-card to-highlight shadow-sm transition-shadow duration-300 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
      >
        <div className='transition-transform duration-500 ease-out group-focus-within/step:scale-90 group-focus-within/step:blur-[1px] group-hover/step:scale-90 group-hover/step:blur-[1px]'>
          <StepVisual />
        </div>
        {/* The explanation, sliding up over the picture. */}
        <div
          id={`step-details-${step.id}`}
          className='pointer-events-none absolute inset-x-3 bottom-3 translate-y-6 rounded-2xl bg-card/95 p-5 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out group-focus-within/step:translate-y-0 group-focus-within/step:opacity-100 group-hover/step:translate-y-0 group-hover/step:opacity-100'
        >
          <p className='text-sm leading-relaxed text-foreground'>{t(step.descKey)}</p>
        </div>
      </div>
    </div>
  );
}

// Original purpose: the landing page's "how it works" (after the Clear Street reference's interactive cards).
// Intentions: the three steps as three frames side by side, an arrow leading from each to the next (down
// instead of across on phones), each frame showing its explanation on hover.
export default function HowItWorks({ className }: { className?: string }) {
  return (
    <ol className={cn('grid items-start gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-3', className)}>
      {_STEPS.map((step, index) => (
        <Fragment key={step.id}>
          <Reveal as='li' delayMs={index * 150} className='min-w-0'>
            <StepFrame step={step} index={index} />
          </Reveal>
          {index < _STEPS.length - 1 && (
            <li aria-hidden='true' className='flex justify-center text-brand-strong md:h-80 md:items-center md:self-end'>
              <ArrowDownIcon className='size-6 md:hidden' />
              <ArrowRightIcon className='hidden size-6 md:block' />
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}
