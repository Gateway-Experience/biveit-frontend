import { useEffect, useRef, useState, type ComponentProps } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { ArrowLeftIcon, ArrowRightIcon, MonitorIcon, RotateCwIcon, SmartphoneIcon, TriangleAlertIcon } from 'lucide-react';

import BuildSketch from 'src/components/pages/projects/preview/BuildSketch';
import { Button } from 'src/components/shadui/button';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from 'src/components/shadui/input-group';
import { Spinner } from 'src/components/common/Spinner';
import { ToggleGroup, ToggleGroupItem } from 'src/components/shadui/toggle-group';
import {
  canStepPreviewHistory, createPreviewNavigation, getCurrentPreviewPath, navigatePreviewTo, normalizePreviewPath,
  recordPreviewLocation, reloadPreview, stepPreviewHistory,
} from 'src/services/previewNavigation';
import { useElementSize } from 'src/utils/hooks';
import type { DevenvBuild, PreviewDevice, PreviewState } from 'src/types/preview';

// The narrowest the site is rendered at per device. Desktop otherwise takes the panel's whole width; a
// panel narrower than this gets the site scaled down to fit instead, so "desktop" still looks like
// desktop on a phone. Mobile is always phone-width.
const _DEVICE_MIN_WIDTHS: Record<PreviewDevice, number> = { desktop: 1024, mobile: 390 };

// What the previewed site posts to us (`window.parent.postMessage({ type, path }, '*')`) whenever its
// location changes, so the location bar can follow links clicked inside it. The frame is another origin,
// so we can't read its location ourselves. A site that doesn't post just leaves the bar where we put it.
// The old name stays accepted: sites set up before the rebrand still post it (their index.html is theirs).
const _LOCATION_MESSAGE_TYPES = ['biveit:preview-location', 'vib3:preview-location'];

// Back/forward/reload come down a size on phones, leaving the location bar more room.
const _NAV_BUTTON_CLASS = 'max-sm:size-7';

// The site in a frame. It opens `src` when it mounts and then leaves the frame alone: a new `src` on a live
// frame would navigate it (and add an entry to the PAGE's history, hijacking the browser's own back
// button). To open somewhere else, mount a new one (see `loadCount`).
// Until the page has loaded, a spinner covers it: a dev server that just started compiles the site on its
// first visit, which can take a while, and a blank white frame reads as broken. Each mount (a new load, the
// site coming back) starts covered again. Placed over the frame's box, so its parent has to be `relative`.
function PreviewFrame({ src, ...frameProps }: ComponentProps<'iframe'> & { src: string }) {
  const { t } = useTranslation();
  const [initialSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <>
      <iframe src={initialSrc} onLoad={() => setIsLoaded(true)} {...frameProps} />
      {!isLoaded && (
        <div data-section='preview-loading' className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground'>
          <Spinner className='size-5' />
          {t('preview_loading')}
        </div>
      )}
    </>
  );
}

// Original purpose: the live preview of the site being built, next to (or tabbed with) the agent chat.
// Intentions: a tiny browser around the dev site — back/forward, reload, a location bar where only the
// path is editable (the domain always reads example.com), open in a new tab, and a desktop/mobile switch.
// The site only shows while it's `live`; otherwise the area says why (being set up, or not running).
// Where the user was browsing survives those in-betweens, so a restart lands them back on the same page.
// Fills whatever box it's given.
export default function SitePreview({ state, siteUrl, build, buildSketch, className }: {
  state: Exclude<PreviewState, 'planning'>;
  // The dev site's origin, e.g. http://localhost:10102. Always there when `live`.
  siteUrl: string | null;
  // The agent's build in progress, if any: the site may be half-done meanwhile.
  build: DevenvBuild | null;
  // What the building animation shows the site as (see BuildSketch): the project's name and a tagline.
  buildSketch: { siteName: string; tagline?: string };
  className?: string;
}) {
  const { t } = useTranslation();
  const [navigation, setNavigation] = useState(() => createPreviewNavigation());
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  // What's in the location bar while the user is typing in it; null = not editing, show where we are.
  // Either way it's the path WITHOUT its leading slash: that slash is fixed, part of the domain's label.
  const [typedPath, setTypedPath] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [setStageElement, stageSize] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    const receiveLocation = (event: MessageEvent) => {
      // Only our frame gets to move the location bar.
      const isOurLocation = _.includes(_LOCATION_MESSAGE_TYPES, _.get(event.data, 'type'));
      if (event.source !== frameRef.current?.contentWindow || !isOurLocation) {
        return;
      }
      const reportedPath = _.get(event.data, 'path');
      if (_.isString(reportedPath)) {
        setNavigation(previous => recordPreviewLocation(previous, normalizePreviewPath(reportedPath)));
      }
    };
    window.addEventListener('message', receiveLocation);
    return () => window.removeEventListener('message', receiveLocation);
  }, []);

  const isLive = state === 'live' && !!siteUrl;
  const getSiteUrl = (path: string) => new URL(path, siteUrl as string).href;
  const minDeviceWidth = _DEVICE_MIN_WIDTHS[device];
  const deviceWidth = device === 'desktop' ? Math.max(stageSize.width, minDeviceWidth) : minDeviceWidth;
  // Never scaled up: a panel wider than a phone just shows it at real size, centred. 0 = not measured yet.
  const scale = stageSize.width ? Math.min(1, stageSize.width / deviceWidth) : 1;

  return (
    <div data-component='site-preview' data-device={device} data-previewpath={getCurrentPreviewPath(navigation)} className={cn('flex min-h-0 flex-col', className)}>
      <div className='flex items-center gap-0.5 border-b px-1.5 py-1.5 sm:gap-1 sm:px-2'>
        <Button variant='ghost' size='icon-sm' className={_NAV_BUTTON_CLASS} aria-label={t('preview_back')} title={t('preview_back')} disabled={!isLive || !canStepPreviewHistory(navigation, -1)} onClick={() => setNavigation(previous => stepPreviewHistory(previous, -1))}>
          <ArrowLeftIcon />
        </Button>
        <Button variant='ghost' size='icon-sm' className={_NAV_BUTTON_CLASS} aria-label={t('preview_forward')} title={t('preview_forward')} disabled={!isLive || !canStepPreviewHistory(navigation, 1)} onClick={() => setNavigation(previous => stepPreviewHistory(previous, 1))}>
          <ArrowRightIcon />
        </Button>
        <Button variant='ghost' size='icon-sm' className={_NAV_BUTTON_CLASS} aria-label={t('preview_reload')} title={t('preview_reload')} disabled={!isLive} onClick={() => setNavigation(reloadPreview)}>
          <RotateCwIcon />
        </Button>

        <form
          className='ml-0.5 min-w-0 flex-1 sm:mx-1'
          onSubmit={e => {
            e.preventDefault();
            setNavigation(previous => navigatePreviewTo(previous, normalizePreviewPath(typedPath ?? getCurrentPreviewPath(previous))));
            setTypedPath(null);
          }}
        >
          <InputGroup className='h-8 rounded-full bg-muted px-1 dark:bg-muted'>
            <InputGroupAddon><InputGroupText>example.com/</InputGroupText></InputGroupAddon>
            <InputGroupInput
              value={typedPath ?? _.trimStart(getCurrentPreviewPath(navigation), '/')}
              disabled={!isLive}
              aria-label={t('preview_location')}
              spellCheck={false}
              onChange={e => setTypedPath(e.target.value)}
              onFocus={e => e.target.select()}
              // Leaving without pressing Enter (or Esc) drops the edit, like a browser.
              onBlur={() => setTypedPath(null)}
              onKeyDown={e => e.key === 'Escape' && e.currentTarget.blur()}
              // Butts the path right up against the domain, so it reads as one address.
              className='pl-0! text-xs'
            />
          </InputGroup>
        </form>

        <ToggleGroup
          value={[device]}
          // Clicking the selected one would deselect it; a preview always has a device, so ignore that.
          onValueChange={([nextDevice]) => nextDevice && setDevice(nextDevice as PreviewDevice)}
          aria-label={t('preview_device')}
          spacing={0}
          variant='outline'
        >
          <ToggleGroupItem value='desktop' aria-label={t('preview_device_desktop')} title={t('preview_device_desktop')}>
            <MonitorIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value='mobile' aria-label={t('preview_device_mobile')} title={t('preview_device_mobile')}>
            <SmartphoneIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* The stage: the space the device gets scaled into. Mobile sits in a phone-ish frame with some room
          around it; desktop takes the whole thing. */}
      <div ref={setStageElement} className={cn('relative min-h-0 flex-1 overflow-hidden bg-muted/50', isLive && device === 'mobile' && 'p-4')}>
        {state === 'busy' && (
          <div className='flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground'>
            <Spinner className='size-5' />
            {t('preview_busy')}
          </div>
        )}
        {state === 'down' && (
          <div className='flex h-full flex-col items-center justify-center px-6 text-center'>
            <TriangleAlertIcon className='mb-3 size-6 text-muted-foreground' />
            <p className='font-medium'>{t('preview_down_title')}</p>
            <p className='mt-1 max-w-xs text-sm text-muted-foreground'>{t('preview_down_body')}</p>
          </div>
        )}
        {/* The scaled-down footprint, so the frame can be centred by its visible size. */}
        {isLive && (
          <div
            className={cn('relative mx-auto overflow-hidden bg-background', device === 'mobile' && 'rounded-[1.75rem] shadow-lg ring-1 ring-foreground/10')}
            style={{ width: deviceWidth * scale, height: stageSize.height }}
          >
            <PreviewFrame
              ref={frameRef}
              // A new frame for every load we ask for — even a reload of the same page. It also mounts fresh
              // whenever the site comes back (e.g. after a restart), on the page the user was last on.
              key={navigation.loadCount}
              src={getSiteUrl(getCurrentPreviewPath(navigation))}
              title={t('preview_frame_title')}
              className='origin-top-left border-0'
              style={{ width: deviceWidth, height: stageSize.height / scale, transform: `scale(${scale})` }}
            />
          </div>
        )}
        {/* While the agent builds, an animation of the site being put together covers the panel: the real site
            underneath may be half-done or still the previous build, which reads as "nothing's happening". It
            also keeps hands off the page meanwhile. The status and timer are in the chat's build panel
            (BuildProgressPanel), so they aren't repeated here. */}
        {isLive && build && (
          <div data-section='preview-building' className='absolute inset-0 animate-in fade-in-0 duration-500'>
            <BuildSketch siteName={buildSketch.siteName} tagline={buildSketch.tagline} className='absolute inset-0' />
          </div>
        )}
      </div>
    </div>
  );
}
