import _ from 'lodash';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
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
// `options.keepsLineBreaks`: a single newline becomes a line break, like in a chat or a GitHub comment.
// Plain markdown joins such lines into one paragraph, which runs chat replies together when they put each
// item on its own line (and a "12. ..." line can't start a list mid-paragraph, so it gets joined too).
// Leave it off for documents, where wrapping a paragraph across lines is normal.
export default function Markdown({ children, className, options = {} }: {
  children: string;
  className?: string;
  options?: { keepsLineBreaks?: boolean };
}) {
  const remarkPlugins = options.keepsLineBreaks ? [remarkGfm, remarkBreaks] : [remarkGfm];
  return (
    <div className={cn('prose prose-sm max-w-none prose-headings:font-heading', _PROSE_TWEAKS_CLASS, className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={_COMPONENTS}>{children}</ReactMarkdown>
    </div>
  );
}
