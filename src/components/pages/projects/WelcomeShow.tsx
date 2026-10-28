import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import _ from 'lodash';

import { BrandMark, BrandWordmark } from 'src/components/common/BrandLogo';
import Modal from 'src/components/common/Modal';
import WelcomeVideo, { useWelcomeVideoDone, WELCOME_VIDEO_TOTAL_MS } from 'src/components/pages/projects/WelcomeVideo';
import { Button } from 'src/components/shadui/button';
import { DialogDescription, DialogTitle } from 'src/components/shadui/dialog';
import { getProjectHistory } from 'src/services/project';
import { addJourneyStep, getMyJourneys } from 'src/services/user';
import { useStore } from 'src/state-store';
import type { UserJourneyStep } from 'src/types/user';
import { APP_NAME } from 'src/utils/constants';
import { useMediaQuery } from 'src/utils/hooks';

// The `welcome` journey's steps, as logged on the account (services/user.addJourneyStep). Its latest step says
// what's next: nothing yet → the show, which ends on the experience question; the show skipped (or watched to the
// end before the question moved into it) → the question on its own; answered, or left out because they came from
// the landing site with an idea → done.
const _STEP = {
  skippedLandingIdea: 'skipped_landing_idea',
  slideshowFinished: 'slideshow_finished',
  slideshowSkipped: 'slideshow_skipped',
  experienceAnswered: 'experience_answered', // data: { experience: one of _EXPERIENCE_OPTIONS' values }
} as const;

// When the headline starts lighting up, and the gap between its words.
const _TITLE_DELAY_MS = 300;
const _WORD_STAGGER_MS = 90;

// The intro scene before the show: how long it stays, and when it starts fading out (the fade fills the rest).
const _INTRO_MS = 1800;
const _INTRO_FADE_AT_MS = 1350;

// Per browser, the accounts that are past the show: they don't get the cover while the journey loads, so
// returning users never see it flash. Only a convenience — without it, the cover just shows for a moment.
const _WELCOME_SEEN_KEY_PREFIX = 'biveit:welcome-seen:';

function _hasSeenWelcomeHere(userId: number) {
  try {
    return window.localStorage.getItem(`${_WELCOME_SEEN_KEY_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

function _rememberWelcomeSeenHere(userId: number) {
  try {
    window.localStorage.setItem(`${_WELCOME_SEEN_KEY_PREFIX}${userId}`, '1');
  } catch {
    // Private mode or blocked storage: the cover just shows for a moment on the next load.
  }
}

// The two answers, said plainly: never made a website, or made some before.
const _EXPERIENCE_OPTIONS = [
  { value: 'first_timer', labelKey: 'experience_first_timer' },
  { value: 'experienced', labelKey: 'experience_experienced' },
];

// Original purpose: the first-time experience on the projects page, for accounts that have never made a project.
// A short, self-playing "video" of how Biveit works (WelcomeVideo) that ends on one question: have they made a
// website before. Both are the account's `welcome` journey, so they're seen once, on any device, and the answer
// is kept with it (the experience_answered step's data). Skipping the video still asks the question, on its own.
// While it's still working out whether the show is due, it covers the page with the stage's backdrop, so a new
// account goes straight from signing up into the show without a glimpse of the page behind it.
// People who arrive with an idea typed on the landing site came to build, not to watch a show: they're left out
// for good (the journey logs that they were).
// It waits for the cookie card, and for the new-project form if that's open, so there's one thing at a time.
// Mount it with the page, not after its content: it needs to be there from the first paint to cover it.
export default function WelcomeShow() {
  const queryClient = useQueryClient();
  const user = useStore(state => state.user);
  const cookieConsent = useStore(state => state.cookieConsent);
  const isNewProjectOpen = useStore(state => state.isNewProjectOpen);
  const hasLandingIdea = useStore(state => state.hasLandingIdea);
  const journeysKey = ['my-journeys', user?.id];
  const { data: journeys, isError: hasJourneysFailed } = useQuery({ queryKey: journeysKey, queryFn: getMyJourneys, enabled: !!user });
  // undefined until the journeys are in.
  const welcomeStep = journeys?.welcome?.step;
  const isShowDue = !!journeys && !welcomeStep;
  // Only asked while the show could still be due. undefined until it's answered: nothing shows meanwhile.
  const { data: projectHistory, isError: hasHistoryFailed } = useQuery({
    queryKey: ['project-history', user?.id],
    queryFn: getProjectHistory,
    enabled: isShowDue,
    staleTime: 0,
  });
  const isNewcomer = projectHistory?.has_created_project === false;
  // Still finding out whether the show is due (a failed load counts as "not due", rather than covering forever).
  const isDeciding = !!user && ((!journeys && !hasJourneysFailed) || (isShowDue && !projectHistory && !hasHistoryFailed));
  const isPastShow = !!welcomeStep || projectHistory?.has_created_project === true;

  useEffect(() => {
    if (user?.id && isPastShow) {
      _rememberWelcomeSeenHere(user.id);
    }
  }, [user, isPastShow]);

  const logStep = async (step: string, options: { data?: Record<string, unknown> } = {}) => {
    // Acted on straight away, without waiting for the server; its answer then replaces this stand-in.
    const standIn: UserJourneyStep = { id: 0, journey: 'welcome', step, data: options.data || {}, created_at: new Date().toISOString() };
    queryClient.setQueryData(journeysKey, { ...journeys, welcome: standIn });
    const logged = await addJourneyStep('welcome', step, options);
    queryClient.setQueryData(journeysKey, { ...journeys, welcome: logged });
  };

  const shouldSkipForLandingIdea = isShowDue && isNewcomer && hasLandingIdea;
  useEffect(() => {
    if (shouldSkipForLandingIdea) {
      logStep(_STEP.skippedLandingIdea);
    }
    // logStep is remade every render; this should fire once, when the skip becomes due.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSkipForLandingIdea]);

  if (!user || !cookieConsent || isNewProjectOpen) {
    return null;
  }
  if (isDeciding && !hasLandingIdea && !(user.id && _hasSeenWelcomeHere(user.id))) {
    return createPortal(<div aria-hidden='true' className={_STAGE_CLASS}><StageBackdrop /></div>, document.body);
  }
  if (isShowDue && isNewcomer && !hasLandingIdea) {
    return (
      <WelcomeStage
        onDone={experience => (experience
          ? logStep(_STEP.experienceAnswered, { data: { experience } })
          : logStep(_STEP.slideshowSkipped))}
      />
    );
  }
  if (welcomeStep === _STEP.slideshowFinished || welcomeStep === _STEP.slideshowSkipped) {
    return <ExperienceModal onAnswer={experience => logStep(_STEP.experienceAnswered, { data: { experience } })} />;
  }
  return null;
}

// The stage: a light, full-window layer over everything, washed with the brand's lavender and lime.
const _STAGE_CLASS = 'fixed inset-0 z-[70] flex cursor-default flex-col overflow-x-hidden overflow-y-auto bg-[#FAFBF6] text-brand-ink select-none';

// The stage's two glows: lavender from above, lime from below. Shared by the stage and the cover before it, so
// one turns into the other without a seam.
function StageBackdrop() {
  return (
    <>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -top-1/4 left-1/2 h-[125%] w-[min(1100px,160vw)] -translate-x-1/2'
        style={{ backgroundImage: 'radial-gradient(50% 60% at 50% 0%, color-mix(in oklab, var(--brand-lavender) 38%, transparent) 0%, transparent 100%)' }}
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 bottom-0 h-2/3'
        style={{ backgroundImage: 'radial-gradient(60% 55% at 50% 100%, color-mix(in oklab, var(--brand-light) 45%, transparent) 0%, transparent 100%)' }}
      />
    </>
  );
}

// The show itself: the stage, opening on a short intro scene (WelcomeIntro), then a headline and the video playing
// under it (WelcomeShowBody). Ends on the question, and answering it is the way in.
// `onDone(experience)`: called once the stage has faded out, with the answer — or null when it was skipped.
function WelcomeStage({ onDone }: { onDone: (experience: string | null) => void }) {
  const { t } = useTranslation();
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // With reduced motion there's nothing to watch in the intro: straight to the show.
  const [isIntroDone, setIsIntroDone] = useState(false);
  // Set when the show ends: the stage fades out, then hands over (see the root's onAnimationEnd).
  const [leaving, setLeaving] = useState<{ experience: string | null } | null>(null);
  const leave = (experience: string | null) => setLeaving(current => current || { experience });

  useEffect(() => {
    if (isIntroDone) {
      return;
    }
    const timer = setTimeout(() => setIsIntroDone(true), _INTRO_MS);
    return () => clearTimeout(timer);
  }, [isIntroDone]);

  // Portalled to <body>: inside the page it'd be stuck in the page's stacking context, under the sidebar.
  // The stage itself doesn't fade in (it takes over from the cover, which looks the same); what's on it does.
  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-label={t('welcome_intro_title')}
      onAnimationEnd={event => leaving && event.target === event.currentTarget && onDone(leaving.experience)}
      className={cn(_STAGE_CLASS, leaving && 'animate-out fade-out-0 duration-500 fill-mode-forwards')}
    >
      <StageBackdrop />
      {isIntroDone || isReducedMotion ? <WelcomeShowBody onLeave={leave} /> : <WelcomeIntro />}
    </div>,
    document.body,
  );
}

// Intentions: a beat before the show, so signing up doesn't drop people straight into a moving canvas: the mark
// pops in, "Welcome to Biveit." lights up word by word, and the scene fades away into the show (_INTRO_MS).
function WelcomeIntro() {
  const { t } = useTranslation();
  const [isFading, setIsFading] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsFading(true), _INTRO_FADE_AT_MS);
    return () => clearTimeout(timer);
  }, []);
  const greetingWords = _.split(t('welcome_intro_title'), ' ');

  return (
    <div
      data-section='welcome-intro'
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center',
        isFading && 'animate-out fade-out-0 zoom-out-95 duration-[450ms] fill-mode-forwards',
      )}
    >
      <BrandMark className='h-16 w-auto animate-in fade-in-0 zoom-in-50 duration-500 ease-out sm:h-20' />
      <h2 className='font-heading text-3xl font-bold tracking-[-0.03em] sm:text-5xl'>
        {_.map(greetingWords, (word, wordIndex) => (
          <Fragment key={wordIndex}>
            <span
              className='inline-block animate-[welcome-reveal_700ms_ease-out_both]'
              style={{ animationDelay: `${250 + wordIndex * _WORD_STAGGER_MS}ms` }}
            >
              {_renderWithWordmark(word)}
            </span>
            {wordIndex < greetingWords.length - 1 && ' '}
          </Fragment>
        ))}
      </h2>
    </div>
  );
}

// The show after the intro: a headline and the video playing under it, with a thin bar at the top filling over
// the video's running time. Mounted when the intro ends, so the video and the bar start from there. Until it's
// done, Skip (or Esc) leaves; once it's done, the headline gives way to the question.
// `onLeave(experience)`: the show is over — with the answer, or null when it was skipped.
function WelcomeShowBody({ onLeave }: { onLeave: (experience: string | null) => void }) {
  const { t } = useTranslation();
  const isVideoDone = useWelcomeVideoDone();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isVideoDone) {
        onLeave(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVideoDone, onLeave]);

  const titleWords = _.split(t('welcome_video_title'), ' ');
  // The body lights up once the headline's last word has.
  const bodyDelayMs = _TITLE_DELAY_MS + titleWords.length * _WORD_STAGGER_MS + 200;

  return (
    <>
      {/* The running-time bar, and the way out (hidden, not removed, once it's done, so the bar keeps its width). */}
      <div className='relative flex items-center gap-4 px-6 pt-5 animate-in fade-in-0 duration-700'>
        <span className='h-0.5 flex-1 overflow-hidden rounded-full bg-brand-ink/10'>
          <span
            className='block size-full origin-left bg-brand-ink/60 motion-reduce:animate-none'
            style={{ animation: `welcome-progress ${WELCOME_VIDEO_TOTAL_MS}ms linear both` }}
          />
        </span>
        <Button
          variant='ghost'
          size='sm'
          data-action='skip-welcome'
          onClick={() => onLeave(null)}
          className={cn('text-brand-ink/60 hover:bg-brand-ink/5 hover:text-brand-ink', isVideoDone && 'invisible')}
        >
          {t('welcome_skip')}
        </Button>
      </div>

      <div className='relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 text-center'>
        {/* The headline and the question share one spot (the same grid cell): the question takes over when the
            video ends, and the canvas under them doesn't move. */}
        <div className='grid w-full max-w-4xl place-items-center'>
          <div className={cn('col-start-1 row-start-1 flex flex-col items-center transition-all duration-500', isVideoDone && 'pointer-events-none -translate-y-2 opacity-0')}>
            <h2 className='font-heading text-3xl font-bold tracking-[-0.03em] sm:text-5xl'>
              {_.map(titleWords, (word, wordIndex) => (
                // The space sits between the words, not inside them: a trailing space inside an inline-block collapses.
                <Fragment key={wordIndex}>
                  <span
                    className='inline-block animate-[welcome-reveal_900ms_ease-out_both] motion-reduce:animate-none'
                    style={{ animationDelay: `${_TITLE_DELAY_MS + wordIndex * _WORD_STAGGER_MS}ms` }}
                  >
                    {_renderWithWordmark(word)}
                  </span>
                  {wordIndex < titleWords.length - 1 && ' '}
                </Fragment>
              ))}
            </h2>
            <p
              className='mt-4 max-w-2xl text-base text-brand-ink/65 animate-[welcome-reveal_900ms_ease-out_both] motion-reduce:animate-none sm:text-lg'
              style={{ animationDelay: `${bodyDelayMs}ms` }}
            >
              {t('welcome_video_body')}
            </p>
          </div>
          {isVideoDone && (
            <div data-section='welcome-question' className='col-start-1 row-start-1 flex flex-col items-center animate-[welcome-reveal_700ms_ease-out_both] motion-reduce:animate-none'>
              <span className='text-xs font-semibold tracking-[0.2em] text-brand-ink/55 uppercase'>{t('experience_title')}</span>
              <h2 className='mt-3 font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl'>{t('experience_question')}</h2>
              <p className='mt-2 text-brand-ink/65'>{t('experience_body')}</p>
              <div className='mt-6 flex flex-wrap justify-center gap-3'>
                {_.map(_EXPERIENCE_OPTIONS, (option, index) => (
                  <Button
                    key={option.value}
                    variant='outline'
                    autoFocus={index === 0}
                    data-experience={option.value}
                    onClick={() => onLeave(option.value)}
                    // pb-0.5: Commissioner keeps more room above its letters than below, so centred text sits a hair low.
                    className='h-12 min-w-52 rounded-xl bg-white/80 pb-0.5 text-base font-semibold'
                  >
                    {t(option.labelKey)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <WelcomeVideo className='max-w-[1320px] animate-in fade-in-0 duration-700' />
      </div>
    </>
  );
}

// [Pure] One word of a headline, with the name in it ("Biveit.") drawn as the wordmark.
function _renderWithWordmark(word: string) {
  const wordParts = _.split(word, APP_NAME);
  return wordParts.map((wordPart, index) => (
    <Fragment key={index}>
      {wordPart}
      {index < wordParts.length - 1 && <BrandWordmark />}
    </Fragment>
  ));
}

// The question on its own, for those who skipped the show (and accounts that watched it to the end back when it
// ended on "Begin"): have they made a website before. No way to close it other than answering: it's one click,
// and the answer is the point. `onAnswer` gets the chosen option's value.
function ExperienceModal({ onAnswer }: { onAnswer: (experience: string) => void }) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      size='md'
      keyboard={false}
      fullScreenMobile={false}
      header={(
        <div className='p-7 pb-0'>
          <DialogTitle className='text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase'>{t('experience_title')}</DialogTitle>
          <DialogDescription className='sr-only'>{t('experience_question')}</DialogDescription>
        </div>
      )}
    >
      <p className='-mt-3 font-heading text-xl font-bold tracking-[-0.02em]'>{t('experience_question')}</p>
      <p className='mt-2 text-sm text-muted-foreground'>{t('experience_body')}</p>
      <div className='mt-6 grid gap-3 sm:grid-cols-2'>
        {_.map(_EXPERIENCE_OPTIONS, option => (
          <Button
            key={option.value}
            variant='outline'
            data-experience={option.value}
            onClick={() => onAnswer(option.value)}
            // pb-0.5: Commissioner keeps more room above its letters than below, so centred text sits a hair low.
            className='h-12 rounded-xl pb-0.5 text-base font-semibold whitespace-normal'
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </div>
    </Modal>
  );
}
