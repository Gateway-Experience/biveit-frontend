import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { useInterval } from 'src/utils/hooks';

// A star that twinkles by cycling through these, the way Claude Code's spinner does.
const _GLYPHS = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
const _GLYPH_FRAME_MS = 120;

// Light-hearted phrases for "busy building", shown one at a time in this order (a Claude Code nod). Plain,
// everyday words only, no tech terms: the user just needs to know something's cooking. Keys of
// i18nMappings, so each has its translations there.
const _PHRASE_KEYS = [
  'preview_building_phrase_building',
  'preview_building_phrase_tinkering',
  'preview_building_phrase_shenaniganing',
  'preview_building_phrase_brewing',
  'preview_building_phrase_assembling',
  'preview_building_phrase_conjuring',
  'preview_building_phrase_polishing',
  'preview_building_phrase_whisking',
  'preview_building_phrase_simmering',
  'preview_building_phrase_kneading',
  'preview_building_phrase_sprinkling',
  'preview_building_phrase_nudging',
  'preview_building_phrase_seasoning',
  'preview_building_phrase_aligning',
  'preview_building_phrase_hammering',
  'preview_building_phrase_stirring',
  'preview_building_phrase_mixing',
  'preview_building_phrase_plumbing',
  'preview_building_phrase_doodling',
  'preview_building_phrase_cooking',
];
const _PHRASE_DURATION_MS = 3000;

// [Pure] 7 -> "7s", 83 -> "1m 23s", 3720 -> "1h 2m".
function _formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) {
    return `${hours}h ${minutes}m`;
  }
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// The twinkling star on its own — e.g. next to a tab's label. Decorative: whatever it sits next to says
// what's going on. Coloured with `ring`, the theme's deeper take on the primary green: the primary itself
// is too pale to make out a glyph this small on a light background.
export function BuildGlyph({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);
  useInterval(() => setFrame(previous => previous + 1), _GLYPH_FRAME_MS);

  return (
    <span aria-hidden className={cn('inline-block w-[1em] text-center text-ring', className)}>
      {_GLYPHS[frame % _GLYPHS.length]}
    </span>
  );
}

// Intentions: "Shenaniganing… (1m 23s) ✻" — the agent is building the site, said playfully: the star
// twinkles, the phrase changes every few seconds, and the time counts up from when the build started.
export function BuildStatus({ since, className }: { since: string; className?: string }) {
  const { t } = useTranslation();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useInterval(() => setNowMs(Date.now()), 1000);

  const sinceMs = Date.parse(since);
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - sinceMs) / 1000));
  // Driven by the build's own clock, so the phrase and the timer move together — and every status showing
  // the same build agrees on the phrase.
  const phraseKey = _PHRASE_KEYS[Math.floor(elapsedSeconds * 1000 / _PHRASE_DURATION_MS) % _PHRASE_KEYS.length];

  return (
    <span role='status' className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span className='font-medium text-foreground'>{t(phraseKey)}</span>
      <span className='tabular-nums'>({_formatElapsed(elapsedSeconds)})</span>
      {/* Last, so it stays put when this sits against a right edge (the tab strip) and the phrase changes
          length. */}
      <BuildGlyph className='text-sm' />
    </span>
  );
}
