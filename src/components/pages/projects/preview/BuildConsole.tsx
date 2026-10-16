import { useState } from 'react';
import _ from 'lodash';
import { cn } from 'cn';

import { useInterval, useMediaQuery } from 'src/utils/hooks';

// How fast it "types": characters per tick, and the tick length.
const _CHARS_PER_TICK = 4;
const _TICK_MS = 35;
// How many lines are kept on screen (older ones scroll off the top).
const _VISIBLE_LINE_COUNT = 40;

// [Pure] Where the typing is after `typedChars` characters, looping over `lines` forever: which line
// number we're on (counting across loops) and how much of it is out. Each line counts its newline too, so
// a blank line still takes a beat.
function _locateTyping(lines: string[], typedChars: number) {
  const lineLengths = lines.map(line => line.length + 1);
  const passLength = _.sum(lineLengths);
  const pass = Math.floor(typedChars / passLength);
  const charsIntoPass = typedChars % passLength;
  // Walk the running total to find the line holding that character.
  const { lineIndex, charsBefore } = _.reduce(lineLengths, (found, lineLength, index) => (
    found.lineIndex === -1 && charsIntoPass < found.charsBefore + lineLength
      ? { lineIndex: index, charsBefore: found.charsBefore }
      : found.lineIndex === -1 ? { lineIndex: -1, charsBefore: found.charsBefore + lineLength } : found
  ), { lineIndex: -1, charsBefore: 0 });
  return { lineNumber: pass * lines.length + lineIndex, typedInLine: charsIntoPass - charsBefore };
}

// [Pure] Splits a line into coloured pieces with a few regexes: good enough to look like code, which is
// all it has to do. Log lines (✓ / →) get one colour for the whole line.
function _highlightLine(line: string): { text: string; className?: string }[] {
  if (_.startsWith(line, '✓')) {
    return [{ text: line, className: 'text-success' }];
  }
  if (_.startsWith(line, '→')) {
    return [{ text: line, className: 'text-brand-light' }];
  }
  if (_.startsWith(_.trimStart(line), '//')) {
    return [{ text: line, className: 'text-primary-foreground/40 italic' }];
  }
  const tokenPattern = /('[^']*'|"[^"]*")|\b(import|from|export|default|async|function|const|return|await)\b|(<\/?[A-Z]\w*)/g;
  const pieces: { text: string; className?: string }[] = [];
  let lastEnd = 0;
  // Intentional mutation: collecting regex matches is a loop by nature, and it's local to this function.
  for (const match of line.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (start > lastEnd) {
      pieces.push({ text: line.slice(lastEnd, start) });
    }
    const [text, stringToken, keyword] = match;
    pieces.push({ text, className: stringToken ? 'text-success' : keyword ? 'text-brand-light' : 'text-chart-5' });
    lastEnd = start + text.length;
  }
  if (lastEnd < line.length) {
    pieces.push({ text: line.slice(lastEnd) });
  }
  return pieces;
}

// Intentions: while the agent builds, fill the preview with code typing itself out, movie-hacker style,
// `lines` played in order and then from the top again (written from the project, see buildConsoleScript),
// so the wait feels like watching the site being made rather than staring at a spinner. Newest line at
// the bottom, older ones fading out at the top. With reduced motion on, it's a still screenful.
// Original purpose: the preview's "building" state (see SitePreview).
export default function BuildConsole({ lines, className }: { lines: string[]; className?: string }) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // The only state: how many characters have been typed so far. Everything on screen derives from it.
  const [typedChars, setTypedChars] = useState(0);
  useInterval(() => setTypedChars(previous => previous + _CHARS_PER_TICK), prefersReducedMotion ? null : _TICK_MS);

  if (_.isEmpty(lines)) {
    return <div aria-hidden='true' className={cn('bg-brand-ink', className)} />;
  }
  const { lineNumber, typedInLine } = prefersReducedMotion
    ? { lineNumber: _VISIBLE_LINE_COUNT - 1, typedInLine: Infinity }
    : _locateTyping(lines, typedChars);
  const firstLineNumber = Math.max(0, lineNumber - _VISIBLE_LINE_COUNT + 1);
  const visibleLines = _.range(firstLineNumber, lineNumber + 1).map(number => {
    const fullLine = lines[number % lines.length];
    return { number, text: number === lineNumber ? fullLine.slice(0, typedInLine) : fullLine };
  });

  return (
    // Solid backdrop, with only the lines fading out at the top, so nothing of the half-done site shows through.
    <div aria-hidden='true' className={cn('overflow-hidden bg-brand-ink', className)}>
      <div className='flex h-full flex-col justify-end px-5 pb-24 font-mono text-[0.8125rem] leading-6 text-primary-foreground/85 mask-t-from-55%'>
        {visibleLines.map(line => (
          // whitespace-pre keeps the indentation; the line itself clips with an ellipsis instead of wrapping.
          <div key={line.number} className='flex gap-4 whitespace-pre'>
            <span className='w-8 shrink-0 text-right text-primary-foreground/25 tabular-nums'>{line.number + 1}</span>
            <span className='min-w-0 overflow-hidden text-ellipsis'>
              {_highlightLine(line.text).map((piece, index) => (
                <span key={index} className={piece.className}>{piece.text}</span>
              ))}
              {line.number === lineNumber && <span className='ml-px inline-block h-4 w-2 translate-y-0.5 animate-caret-blink bg-brand-light' />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
