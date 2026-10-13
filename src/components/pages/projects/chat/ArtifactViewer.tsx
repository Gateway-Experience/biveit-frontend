import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileIcon, FileTextIcon, ImageIcon } from 'lucide-react';

import ImageLightbox from 'src/components/common/ImageLightbox';
import Markdown from 'src/components/common/Markdown';
import { Spinner } from 'src/components/shadui/spinner';
import { getConversationFileText } from 'src/services/chat';
import type { Artifact } from 'src/types/chat';

// How a file gets displayed, decided by its mime type.
type ArtifactDisplay = 'markdown' | 'image' | 'frame' | 'text' | 'none';

// [Pure]
function _getArtifactDisplay(mime: string): ArtifactDisplay {
  if (mime === 'text/markdown') {
    return 'markdown';
  }
  if (mime.startsWith('image/')) {
    return 'image';
  }
  // Rendered by the browser itself. The BE serves files with a sandbox CSP, so an HTML page can't run script.
  if (mime === 'text/html' || mime === 'application/pdf') {
    return 'frame';
  }
  if (mime.startsWith('text/') || mime === 'application/json') {
    return 'text';
  }
  return 'none';
}

function ArtifactIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime.startsWith('image/')) {
    return <ImageIcon className={className} />;
  }
  return mime.startsWith('text/') ? <FileTextIcon className={className} /> : <FileIcon className={className} />;
}

// Fetches the file as text — again only when its version changes (the cache key is path + version).
// undefined = loading, null = failed.
function useArtifactText(conversationId: number, path: string, version: string, isNeeded: boolean) {
  const [text, setText] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isNeeded) {
      return;
    }
    // A newer version (or another file) may be requested before this one lands; drop the late answer.
    let isStale = false;
    setText(undefined);
    getConversationFileText(conversationId, path)
      .then(fetchedText => !isStale && setText(fetchedText))
      .catch(() => !isStale && setText(null));
    return () => {
      isStale = true;
    };
  }, [conversationId, path, version, isNeeded]);
  return text;
}

// Intentions: shows one artifact's contents — markdown rendered, images as images, HTML/PDF in a frame,
// other text as-is. Anything else gets a pointer to open the file instead.
export default function ArtifactViewer({ artifact, conversationId, fileUrl }: {
  artifact: Artifact;
  conversationId: number;
  // For <img>/<iframe>; carries the version, so a revision is a new URL.
  fileUrl: string;
}) {
  const { t } = useTranslation();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const display = _getArtifactDisplay(artifact.mime);
  const text = useArtifactText(conversationId, artifact.path, artifact.version, display === 'markdown' || display === 'text');

  if (display === 'image') {
    return (
      <>
        <button type='button' aria-label={artifact.title} onClick={() => setIsLightboxOpen(true)} className='mx-auto block cursor-zoom-in'>
          <img src={fileUrl} alt={artifact.title} className='max-w-full rounded-lg' />
        </button>
        <ImageLightbox src={fileUrl} alt={artifact.title} open={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} />
      </>
    );
  }
  if (display === 'frame') {
    // Belt and braces on HTML (the BE's sandbox header already covers it). Not on PDFs: a sandboxed frame
    // can stop the browser's PDF viewer from loading.
    return (
      <iframe
        src={fileUrl}
        title={artifact.title}
        sandbox={artifact.mime === 'text/html' ? '' : undefined}
        className='h-full min-h-96 w-full rounded-lg border bg-card'
      />
    );
  }
  if (display === 'none') {
    return <p className='py-10 text-center text-sm text-muted-foreground'>{t('artifact_no_preview')}</p>;
  }
  if (text === undefined) {
    return <div className='flex justify-center py-10'><Spinner className='size-5 text-muted-foreground' /></div>;
  }
  if (text === null) {
    return <p className='py-10 text-center text-sm text-muted-foreground'>{t('artifact_load_failed')}</p>;
  }
  return display === 'markdown'
    ? <Markdown>{text}</Markdown>
    : <pre className='overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap'>{text}</pre>;
}

export { ArtifactIcon };
