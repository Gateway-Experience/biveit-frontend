import _ from 'lodash';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from 'cn';

// Undoes two of the typography plugin's print-style defaults that look odd on screen: inline `code` gets
// literal backticks around it (it gets a muted chip instead), and blockquotes get curly quotes and italics.
// Code blocks (`pre > code`) keep their own styling.
const _PROSE_TWEAKS_CLASS = cn(
  '[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-normal',
  '[&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none',
  'prose-blockquote:font-normal prose-blockquote:not-italic [&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none',
);

// Links open in a new tab: they point off the app, and following one in place would leave it.
const _COMPONENTS: Components = {
  // `node` is react-markdown's syntax tree node, not an <a> attribute.
  a: props => <a {..._.omit(props, 'node')} target='_blank' rel='noreferrer' />,
};

// Renders a markdown string (GitHub flavour: tables, task lists, strikethrough...) with the typography
// styles, coloured by the theme (see `.prose` in styles/index.css). Raw HTML in the source is NOT rendered —
// react-markdown escapes it by default, which is what we want for content we didn't write.
export default function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose prose-sm max-w-none prose-headings:font-heading', _PROSE_TWEAKS_CLASS, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={_COMPONENTS}>{children}</ReactMarkdown>
    </div>
  );
}
