import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { APP_NAME } from 'src/utils/constants';
import { useElementSize, useInterval, useMediaQuery } from 'src/utils/hooks';

// Intentions: the first-time welcome "video" — a canvas that builds itself, the way a project goes in Biveit.
// Two cursors share it: the user's (lavender) drops in their idea and steers, the agent's (lime) does the work —
// a plan, the pages, a brand style, the build — wired left to right, ending on the live site. Drawn in code
// rather than shipped as a video file: it's crisp at any size, follows the user's language, and weighs nothing.
// It plays once (TOTAL_MS) and then rests on the finished canvas, with the live site flipping through its pages.
// With reduced motion it just shows the finished canvas.

// The canvas is laid out at this size and scaled down to fit (never up).
const _CANVAS = { width: 1320, height: 540 };
// Every time on this page is written at 1x and the clock runs _SPEED times as fast, so the pace is one knob.
const _SPEED = 1.5;
// When the whole build is done (in real time); the show asks its question from here.
export const WELCOME_VIDEO_TOTAL_MS = 14500 / _SPEED;
// How often the clock ticks. Movement between ticks is CSS transitions, so this only has to be fine enough
// for things to show up on time.
const _TICK_MS = 100;
// The wires and their ports: the brand lime deepened toward its strong green, since pure lime vanishes on a light stage.
const _WIRE_COLOR = 'color-mix(in oklab, var(--brand-light) 55%, var(--brand-strong))';
// How long the finished live site shows each page before flipping to the next.
const _LIVE_PAGE_MS = 2600;

type NodeKind = 'idea' | 'kinds' | 'plan' | 'home' | 'products' | 'checkout' | 'brand' | 'build' | 'live';
// Where each card sits on the canvas, when it pops in, and (for the ones that start as an empty frame) when its
// picture fills in.
const _NODES: Record<NodeKind, { x: number; y: number; w: number; h: number; at: number; filledAt?: number }> = {
  idea: { x: 30, y: 140, w: 210, h: 128, at: 500 },
  kinds: { x: 30, y: 300, w: 210, h: 92, at: 1700 },
  plan: { x: 280, y: 214, w: 180, h: 118, at: 3100 },
  home: { x: 500, y: 70, w: 190, h: 120, at: 4400, filledAt: 5700 },
  products: { x: 500, y: 214, w: 190, h: 120, at: 4600, filledAt: 6300 },
  checkout: { x: 500, y: 358, w: 190, h: 120, at: 4800, filledAt: 6900 },
  brand: { x: 735, y: 96, w: 180, h: 104, at: 8900 },
  build: { x: 900, y: 320, w: 175, h: 110, at: 10200 },
  live: { x: 1095, y: 110, w: 215, h: 200, at: 11600, filledAt: 12700 },
};

// The wires, each drawn from the first card's right edge to the second's left as the second one appears.
const _WIRES: [NodeKind, NodeKind][] = [
  ['idea', 'plan'], ['kinds', 'plan'],
  ['plan', 'home'], ['plan', 'products'], ['plan', 'checkout'],
  ['products', 'brand'], ['checkout', 'build'], ['brand', 'build'],
  ['build', 'live'],
];

// Where each cursor glides to, and when (it stays on its last stop until the next). The agent's shows up once
// the user has said what they want.
type CursorStop = { at: number; x: number; y: number };
const _USER_STOPS: CursorStop[] = [
  { at: 0, x: 90, y: 90 }, { at: 400, x: 70, y: 130 }, { at: 1500, x: 70, y: 292 },
  { at: 2600, x: 200, y: 470 }, { at: 7700, x: 610, y: 236 }, { at: 9400, x: 540, y: 500 },
];
const _AGENT_STOPS: CursorStop[] = [
  { at: 2600, x: 310, y: 170 }, { at: 3000, x: 300, y: 220 }, { at: 4300, x: 520, y: 76 },
  { at: 4550, x: 520, y: 220 }, { at: 4750, x: 520, y: 364 }, { at: 5500, x: 620, y: 120 },
  { at: 6100, x: 620, y: 262 }, { at: 6700, x: 620, y: 406 }, { at: 8700, x: 765, y: 104 },
  { at: 10000, x: 930, y: 326 }, { at: 11400, x: 1125, y: 120 }, { at: 13300, x: 1200, y: 400 },
];
// The user picks the Products page (the brand style grows out of it): it's ringed from here on.
const _PRODUCTS_PICKED_AT = 8100;

// [Pure] A cursor's latest stop at `elapsedMs`; null before its first.
function _getCursorStop(stops: CursorStop[], elapsedMs: number) {
  return _.findLast(stops, stop => stop.at <= elapsedMs) || null;
}

export default function WelcomeVideo({ className }: { className?: string }) {
  const { t } = useTranslation();
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [startedAtMs] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  useInterval(() => setNowMs(Date.now()), _TICK_MS);
  const elapsedMs = isReducedMotion ? Infinity : (nowMs - startedAtMs) * _SPEED;
  const [setFrameElement, frameSize] = useElementSize<HTMLDivElement>();
  const scale = frameSize.width ? Math.min(1, frameSize.width / _CANVAS.width) : 1;

  const isShown = (kind: NodeKind) => elapsedMs >= _NODES[kind].at;
  const isFilled = (kind: NodeKind) => elapsedMs >= (_NODES[kind].filledAt ?? _NODES[kind].at);
  // Which page the finished live site is showing: flips on a loop once it's filled in.
  const livePageIndex = Math.floor(Math.max(0, elapsedMs - (_NODES.live.filledAt as number)) / _LIVE_PAGE_MS) % 3;
  const LivePage = [HomeMock, ProductsMock, CheckoutMock][isReducedMotion ? 0 : livePageIndex];

  return (
    <div ref={setFrameElement} aria-hidden='true' className={cn('w-full', className)} style={{ height: _CANVAS.height * scale }}>
      <div className='relative origin-top-left text-left' style={{ width: _CANVAS.width, height: _CANVAS.height, transform: `scale(${scale})` }}>
        {/* A faint dot grid, like a canvas to work on. */}
        <div
          className='absolute inset-0 rounded-3xl opacity-60'
          style={{
            backgroundImage: 'radial-gradient(color-mix(in oklab, var(--brand-ink) 14%, transparent) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(70% 70% at 50% 50%, black 40%, transparent 100%)',
          }}
        />

        <svg className='absolute inset-0 overflow-visible' width={_CANVAS.width} height={_CANVAS.height}>
          {_.map(_WIRES, ([from, to]) => {
            const fromNode = _NODES[from];
            const toNode = _NODES[to];
            const [x1, y1] = [fromNode.x + fromNode.w, fromNode.y + fromNode.h / 2];
            const [x2, y2] = [toNode.x, toNode.y + toNode.h / 2];
            const bend = Math.max(40, (x2 - x1) / 2);
            return (
              <path
                key={`${from}-${to}`}
                d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`}
                pathLength={1}
                fill='none'
                stroke={_WIRE_COLOR}
                strokeOpacity={0.85}
                strokeWidth={1.75}
                strokeDasharray={1}
                strokeDashoffset={isShown(to) ? 0 : 1}
                className='transition-[stroke-dashoffset] duration-500 ease-out'
              />
            );
          })}
        </svg>

        <CanvasNode kind='idea' label={t('welcome_video_idea_label')} isShown={isShown('idea')}>
          <p className='text-[13px] leading-snug text-brand-ink/85'>
            <TypedText text={t('welcome_video_idea_text')} startAtMs={_NODES.idea.at + 300} elapsedMs={elapsedMs} />
          </p>
        </CanvasNode>
        <CanvasNode kind='kinds' label={t('welcome_video_kind_label')} isShown={isShown('kinds')}>
          <div className='flex flex-wrap gap-1.5'>
            {_.map(['welcome_video_kind_store', 'welcome_video_kind_blog'], (kindKey, index) => (
              <span
                key={kindKey}
                className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-500', index === 0
                  ? 'bg-brand-lavender/25 text-[#5B3FB0] ring-1 ring-brand-lavender/60 dark:text-brand-lavender'
                  : 'bg-brand-ink/5 text-brand-ink/60')}
              >
                {t(kindKey)}
              </span>
            ))}
          </div>
        </CanvasNode>
        <CanvasNode kind='plan' label={t('welcome_video_plan_label')} isShown={isShown('plan')} isStep>
          <p className='text-[11.5px] leading-snug text-brand-ink/65'>{t('welcome_video_plan_body')}</p>
        </CanvasNode>
        <CanvasNode kind='home' label={t('welcome_video_page_home')} isShown={isShown('home')} isPicture>
          <PictureSlot isFilled={isFilled('home')}><HomeMock /></PictureSlot>
        </CanvasNode>
        <CanvasNode
          kind='products'
          label={t('welcome_video_page_products')}
          isShown={isShown('products')}
          isPicture
          isPicked={elapsedMs >= _PRODUCTS_PICKED_AT}
        >
          <PictureSlot isFilled={isFilled('products')}><ProductsMock /></PictureSlot>
        </CanvasNode>
        <CanvasNode kind='checkout' label={t('welcome_video_page_checkout')} isShown={isShown('checkout')} isPicture>
          <PictureSlot isFilled={isFilled('checkout')}><CheckoutMock /></PictureSlot>
        </CanvasNode>
        <CanvasNode kind='brand' label={t('welcome_video_brand_label')} isShown={isShown('brand')}>
          <div className='flex items-center gap-2'>
            {_.map(['#C9F56A', '#B29BE5', '#0F1E2A', '#EEF2F5'], (swatch, index) => (
              <span
                key={swatch}
                className='size-6 rounded-full ring-1 ring-brand-ink/15 transition-all duration-500'
                style={{ backgroundColor: swatch, transitionDelay: `${300 + index * 120}ms`, opacity: isShown('brand') ? 1 : 0 }}
              />
            ))}
            <span className='ml-auto font-heading text-2xl font-bold text-brand-ink/90'>Aa</span>
          </div>
        </CanvasNode>
        <CanvasNode kind='build' label={t('welcome_video_build_label')} isShown={isShown('build')} isStep>
          <p className='text-[11.5px] leading-snug text-brand-ink/65'>{t('welcome_video_build_body')}</p>
        </CanvasNode>
        <CanvasNode kind='live' label={t('welcome_video_live_label')} isShown={isShown('live')} isPicture isFinal={isFilled('live')}>
          <div className='mt-7 flex h-[calc(100%-1.75rem)] flex-col overflow-hidden rounded-lg bg-white ring-1 ring-brand-ink/10'>
            <div className='flex items-center gap-1 border-b border-black/5 bg-neutral-100 px-2 py-1'>
              {_.map(['bg-red-400', 'bg-amber-400', 'bg-green-400'], dotClass => <span key={dotClass} className={cn('size-1.5 rounded-full', dotClass)} />)}
              <span className='ml-2 truncate rounded bg-white px-2 text-[8px] text-neutral-500'>pcparts.biveit.site</span>
            </div>
            <div className='relative flex-1'>
              <PictureSlot isFilled={isFilled('live')} isLight>
                <div key={livePageIndex} className='size-full animate-in fade-in-0 duration-500'><LivePage /></div>
              </PictureSlot>
            </div>
          </div>
        </CanvasNode>

        <Cursor stop={_getCursorStop(_USER_STOPS, elapsedMs)} label={t('welcome_video_you')} tone='user' />
        <Cursor stop={_getCursorStop(_AGENT_STOPS, elapsedMs)} label={APP_NAME} tone='agent' />
      </div>
    </div>
  );
}

// Intentions: one card on the canvas — a label chip (with a lime dot, like the wires' ends), its content, and
// the little ports the wires plug into. Pops in at its time. `isStep` = a step the agent runs (plan, build: a
// solid card with a description), `isPicture` = a card that's mostly a picture, `isPicked` = the user's
// current pick (lavender ring), `isFinal` = the finished site (a lime glow).
function CanvasNode({ kind, label, isShown, isStep, isPicture, isPicked, isFinal, children }: {
  kind: NodeKind;
  label: string;
  isShown: boolean;
  isStep?: boolean;
  isPicture?: boolean;
  isPicked?: boolean;
  isFinal?: boolean;
  children: ReactNode;
}) {
  const node = _NODES[kind];
  return (
    <div
      data-node={kind}
      className={cn(
        'absolute flex flex-col gap-2 rounded-xl border p-2.5 transition-all duration-300 ease-out',
        isStep ? 'border-brand-ink/12 bg-white shadow-md shadow-brand-ink/5 dark:bg-card' : 'border-brand-ink/10 bg-white/75 shadow-sm shadow-brand-ink/5 backdrop-blur-sm dark:bg-card/75',
        isPicture && 'p-1.5',
        isPicked && 'border-brand-lavender ring-2 ring-brand-lavender/60',
        isFinal && 'shadow-[0_0_60px_-6px] shadow-brand-light',
        isShown ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
      )}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
    >
      <span
        className={cn(
          // The ink named outright: a dark chip in both themes (the stage turns --brand-ink light when dark).
          'z-10 inline-flex w-fit items-center gap-1.5 rounded-md bg-[#0F1E2A] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand-light uppercase',
          isPicture && 'absolute top-2.5 left-2.5',
          isStep && 'self-center bg-transparent text-brand-ink',
        )}
      >
        {/* On the white step cards pale lime vanishes: those take the wires' deeper lime. */}
        <span className='size-1.5 rounded-full bg-brand-light' style={isStep ? { backgroundColor: _WIRE_COLOR } : undefined} />
        {label}
      </span>
      <div className={cn('min-h-0 flex-1', isPicture && 'h-full')}>{children}</div>
      {/* The ports the wires plug into, halfway down each side. */}
      <span className='absolute top-1/2 -left-[3px] size-1.5 -translate-y-1/2 rounded-full' style={{ backgroundColor: _WIRE_COLOR }} />
      <span className='absolute top-1/2 -right-[3px] size-1.5 -translate-y-1/2 rounded-full' style={{ backgroundColor: _WIRE_COLOR }} />
    </div>
  );
}

// A picture's frame: an empty, shimmering slot until it's filled, then the picture fades in over it.
// `isLight` = on the white of the browser frame rather than the dark canvas.
function PictureSlot({ isFilled, isLight, children }: { isFilled: boolean; isLight?: boolean; children: ReactNode }) {
  return (
    <div className={cn('relative size-full overflow-hidden rounded-lg', isLight ? 'bg-neutral-200' : 'bg-brand-ink/8')}>
      {!isFilled && <div className='absolute inset-0 animate-pulse bg-brand-ink/6' />}
      <div className={cn('absolute inset-0 transition-opacity duration-500', isFilled ? 'opacity-100' : 'opacity-0')}>{children}</div>
    </div>
  );
}

// Text typing itself out from `startAtMs`, a character every ~30ms, with a caret while it's going.
function TypedText({ text, startAtMs, elapsedMs }: { text: string; startAtMs: number; elapsedMs: number }) {
  const shownLength = _.clamp(Math.floor((elapsedMs - startAtMs) / 30), 0, text.length);
  return (
    <>
      {text.slice(0, shownLength)}
      {shownLength < text.length && shownLength > 0 && <span className='ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-brand-lavender' />}
    </>
  );
}

// Intentions: a collaborator's cursor — an arrow and a name tag — gliding from stop to stop (the glide is a CSS
// transition between the positions the clock hands it). Hidden before its first stop.
function Cursor({ stop, label, tone }: { stop: CursorStop | null; label: string; tone: 'user' | 'agent' }) {
  const toneColor = tone === 'user' ? 'var(--brand-lavender)' : 'var(--brand-light)';
  const style: CSSProperties = {
    transform: `translate(${stop?.x ?? 0}px, ${stop?.y ?? 0}px)`,
    opacity: stop ? 1 : 0,
  };
  return (
    <div
      data-cursor={tone}
      className='pointer-events-none absolute top-0 left-0 z-20 transition-[transform,opacity] duration-500 ease-in-out'
      style={style}
    >
      <svg width='18' height='20' viewBox='0 0 18 20' className='drop-shadow-md'>
        <path d='M1 1 L17 8 L9.5 10.5 L6.5 18.5 Z' fill={toneColor} stroke='var(--brand-ink)' strokeWidth='1.2' strokeLinejoin='round' />
      </svg>
      <span
        className='mt-0.5 ml-3 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold text-[#0F1E2A] shadow-md'
        style={{ backgroundColor: toneColor }}
      >
        {label}
      </span>
    </div>
  );
}

// The pages the agent "designs": little wireframes of a PC parts shop, in the brand's colours.
function HomeMock() {
  return (
    <div className='flex size-full flex-col gap-1 bg-gradient-to-br from-[#e9f9cf] to-[#efe8ff] p-2 pt-7'>
      <div className='h-2 w-3/5 rounded-full bg-[#0F1E2A]/80' />
      <div className='h-1.5 w-2/5 rounded-full bg-[#0F1E2A]/30' />
      <div className='mt-1 h-3 w-12 rounded-full bg-[#4A7012]' />
      <div className='mt-auto grid grid-cols-3 gap-1'>
        {_.times(3, index => <div key={index} className='h-5 rounded bg-white/80 shadow-sm' />)}
      </div>
    </div>
  );
}

function ProductsMock() {
  return (
    <div className='grid size-full grid-cols-3 gap-1 bg-[#f5f3fb] p-2 pt-7'>
      {_.times(6, index => (
        <div key={index} className='flex flex-col gap-0.5 rounded bg-white p-0.5 shadow-sm'>
          <div className={cn('flex-1 rounded-sm', index % 2 ? 'bg-[#B29BE5]/50' : 'bg-[#C9F56A]/70')} />
          <div className='h-1 w-3/4 rounded-full bg-[#0F1E2A]/40' />
        </div>
      ))}
    </div>
  );
}

function CheckoutMock() {
  return (
    <div className='flex size-full gap-1.5 bg-[#f3f7ee] p-2 pt-7'>
      <div className='flex flex-1 flex-col gap-1'>
        {_.times(3, index => <div key={index} className='h-2.5 rounded border border-[#0F1E2A]/15 bg-white' />)}
        <div className='mt-auto h-3 rounded-full bg-[#4A7012]' />
      </div>
      <div className='flex w-2/5 flex-col gap-1 rounded bg-white p-1 shadow-sm'>
        {_.times(3, index => <div key={index} className='h-1 rounded-full bg-[#0F1E2A]/25' />)}
        <div className='mt-auto h-1.5 w-1/2 self-end rounded-full bg-[#0F1E2A]/70' />
      </div>
    </div>
  );
}

// For the show, which waits on the build before asking its question (and needs a clock of its own for that).
export function useWelcomeVideoDone() {
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [isDone, setIsDone] = useState(false);
  useEffect(() => {
    if (isReducedMotion) {
      setIsDone(true);
      return;
    }
    const timer = setTimeout(() => setIsDone(true), WELCOME_VIDEO_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [isReducedMotion]);
  return isDone;
}
