import { useState, type ReactNode } from 'react';
import _ from 'lodash';
import { cn } from 'cn';

import { useInterval, useMediaQuery } from 'src/utils/hooks';

type CodeTokenKind = 'keyword' | 'tag' | 'string' | 'name' | 'plain' | 'comment';
type CodeLine = [CodeTokenKind, string][];

// The theme's colours for each kind of token, so the "editor" follows light/dark like everything else.
const _TOKEN_CLASSES: Record<CodeTokenKind, string> = {
  keyword: 'text-chart-4',
  tag: 'text-brand-strong',
  string: 'text-ring',
  name: 'text-foreground font-medium',
  plain: 'text-foreground/80',
  comment: 'text-muted-foreground italic',
};

// How fast it types: this many characters every _TYPE_MS, then the finished file holds for _HOLD_TICKS before
// it starts over from an empty file.
const _TYPE_MS = 40;
const _CHARS_PER_TICK = 2;
const _HOLD_TICKS = 60;

// [Pure] A small, made-up page component carrying the site's name: what gets "typed". Not real code from
// the project, just something that reads like a site being written.
function _getCodeLines(siteName: string): CodeLine[] {
  return [
    [['comment', '// The home page']],
    [['keyword', 'export default function '], ['name', 'HomePage'], ['plain', '() {']],
    [['keyword', '  return '], ['plain', '(']],
    [['plain', '    <'], ['tag', 'main'], ['plain', ' className='], ['string', '"page"'], ['plain', '>']],
    [['plain', '      <'], ['tag', 'Header'], ['plain', ' title='], ['string', JSON.stringify(siteName)], ['plain', ' />']],
    [['plain', '      <'], ['tag', 'Hero'], ['plain', '>']],
    [['plain', '        <'], ['tag', 'h1'], ['plain', '>'], ['name', siteName], ['plain', '</'], ['tag', 'h1'], ['plain', '>']],
    [['plain', '        <'], ['tag', 'Button'], ['plain', ' href='], ['string', '"/start"'], ['plain', '>Get started</'], ['tag', 'Button'], ['plain', '>']],
    [['plain', '      </'], ['tag', 'Hero'], ['plain', '>']],
    [['plain', '      <'], ['tag', 'Features'], ['plain', ' items={features} />']],
    [['plain', '      <'], ['tag', 'Gallery'], ['plain', ' columns={3} />']],
    [['plain', '      <'], ['tag', 'Footer'], ['plain', ' />']],
    [['plain', '    </'], ['tag', 'main'], ['plain', '>']],
    [['plain', '  );']],
    [['plain', '}']],
  ];
}

// [Pure] The lines cut off after `charCount` characters (counted across all lines, a line break counting as one),
// for typing them out bit by bit. Lines not reached yet come back empty.
function _cutCodeLines(lines: CodeLine[], charCount: number): CodeLine[] {
  const lineStarts = _.reduce(lines, (starts, line) => (
    [...starts, _.last(starts)! + _.sumBy(line, ([, text]) => text.length) + 1]
  ), [0]);
  return _.map(lines, (line, lineIndex) => {
    const tokenStarts = _.reduce(line, (starts, [, text]) => [...starts, _.last(starts)! + text.length], [lineStarts[lineIndex]]);
    return _.compact(_.map(line, ([kind, text], tokenIndex): [CodeTokenKind, string] | null => {
      const shownLength = _.clamp(charCount - tokenStarts[tokenIndex], 0, text.length);
      return shownLength ? [kind, text.slice(0, shownLength)] : null;
    }));
  });
}

// Intentions: while the site is loading in the preview, a little code editor types out a page, on a loop, so the
// wait looks like work going on rather than a stuck spinner. It's an illustration, not the project's real code.
// `statusText` sits under it, saying what's actually happening. With reduced motion on, it's the finished file,
// still.
// Original purpose: the preview's "loading the site" cover (see SitePreview's PreviewFrame).
export default function CodeTypingSketch({ siteName, statusText, statusIcon, className }: {
  siteName: string;
  statusText: string;
  // Goes before the status, e.g. a spinner.
  statusIcon?: ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [tick, setTick] = useState(0);
  useInterval(() => setTick(previous => previous + 1), prefersReducedMotion ? null : _TYPE_MS);

  const lines = _getCodeLines(siteName);
  const totalChars = _.sumBy(lines, line => _.sumBy(line, ([, text]) => text.length) + 1);
  const loopTicks = Math.ceil(totalChars / _CHARS_PER_TICK) + _HOLD_TICKS;
  const charCount = prefersReducedMotion ? totalChars : (tick % loopTicks) * _CHARS_PER_TICK;
  const shownLines = _cutCodeLines(lines, charCount);
  // The cursor sits at the end of the last line that has anything typed on it (the first line before anything is).
  // Lines past it aren't there yet, so they get no line number either: the file grows as it's typed.
  const cursorLineIndex = Math.max(0, _.findLastIndex(shownLines, line => !_.isEmpty(line)));

  return (
    <div data-component='code-typing-sketch' className={cn('flex flex-col bg-card', className)}>
      <div aria-hidden='true' className='flex items-center gap-1.5 border-b px-4 py-2.5'>
        {_.times(3, index => <span key={index} className='size-2.5 rounded-full bg-muted-foreground/25' />)}
        <span className='ml-3 rounded-md bg-muted px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground'>HomePage.tsx</span>
      </div>
      <pre aria-hidden='true' className='min-h-0 flex-1 overflow-hidden px-4 py-4 font-mono text-xs leading-6'>
        {_.map(_.take(shownLines, cursorLineIndex + 1), (line, lineIndex) => (
          <div key={lineIndex} className='flex whitespace-pre'>
            <span className='w-8 shrink-0 pr-4 text-right text-muted-foreground/50 select-none'>{lineIndex + 1}</span>
            <span className='min-w-0 overflow-hidden text-ellipsis whitespace-pre'>
              {_.map(line, ([kind, text], tokenIndex) => <span key={tokenIndex} className={_TOKEN_CLASSES[kind]}>{text}</span>)}
              {lineIndex === cursorLineIndex && (
                <span className='ml-px inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-primary' />
              )}
            </span>
          </div>
        ))}
      </pre>
      <div className='flex items-center justify-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground'>
        {statusIcon}
        {statusText}
      </div>
    </div>
  );
}
