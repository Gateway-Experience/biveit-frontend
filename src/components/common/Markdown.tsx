import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from 'cn';

// Renders a markdown string (GitHub flavour: tables, task lists, strikethrough...) with the typography
// styles, coloured by the theme (see `.prose` in styles/index.css). Raw HTML in the source is NOT rendered —
// react-markdown escapes it by default, which is what we want for content we didn't write.
export default function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose prose-sm max-w-none prose-headings:font-heading', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
