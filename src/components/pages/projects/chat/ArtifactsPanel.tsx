import { useEffect, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ClipboardListIcon, ExternalLinkIcon, FilesIcon } from 'lucide-react';

import ArtifactViewer, { ArtifactIcon } from 'src/components/pages/projects/chat/ArtifactViewer';
import { Button } from 'src/components/shadui/button';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from 'src/components/shadui/item';
import { Spinner } from 'src/components/common/Spinner';
import { getArtifacts } from 'src/services/chat';
import { formatFileSize } from 'src/utils/common';
import type { Artifact } from 'src/types/chat';

// Plain-words descriptions of the spec files the agent writes while planning (artifacts/*.md, see the
// first-time flow). Other files just show their name and size.
const _SPEC_DESCRIPTION_KEYS: Record<string, string> = {
  'erd.md': 'artifact_desc_erd',
  'flows.md': 'artifact_desc_flows',
  'pages.md': 'artifact_desc_pages',
};

// Intentions: the Documents ("Site plan") tab — everything the agent has written for this conversation. A list, and
// tapping one opens it full-size in place (list -> file -> back), which works in a narrow panel too.
// Which file is open is owned by the parent, since chat cards open files here as well.
// Always the latest: artifacts are rewritten in place, so the list is refetched on mount and whenever the
// agent says something new (`refreshKey`) — it can revise a file without showing it again. Each artifact
// carries a `version`; the open file reloads when its version changes, and only then.
export default function ArtifactsPanel({ conversationId, refreshKey, openPath, onOpenPath, getFileUrl }: {
  conversationId: number;
  // The latest assistant message's seq: when it moves, the list is refetched.
  refreshKey?: number;
  openPath: string | null;
  onOpenPath: (path: string | null) => void;
  getFileUrl: (path: string) => string;
}) {
  const { t } = useTranslation();
  // null = loading.
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);

  useEffect(() => {
    // Refreshes can overlap (the agent may send several messages quickly); only the latest one may land,
    // or an older response arriving last would put back an older version.
    let isStale = false;
    getArtifacts(conversationId)
      .then(fetchedArtifacts => !isStale && setArtifacts(fetchedArtifacts))
      // A failed refresh keeps what's already shown; only a failed first load falls back to "no documents".
      .catch(() => !isStale && setArtifacts(previous => previous || []));
    return () => {
      isStale = true;
    };
  }, [conversationId, refreshKey]);

  const openArtifact = _.find(artifacts, artifact => artifact.path === openPath);
  // The version in the URL keys the browser's copy of this exact revision: a new version is a new URL, so an
  // <img>/<iframe> reloads, while an unchanged one isn't refetched.
  const getVersionedFileUrl = (artifact: Artifact) => `${getFileUrl(artifact.path)}&v=${encodeURIComponent(artifact.version)}`;

  if (_.isNull(artifacts)) {
    return <div className='flex flex-1 items-center justify-center'><Spinner className='size-5 text-muted-foreground' /></div>;
  }

  if (openPath) {
    return (
      <div data-component='artifact-view' data-artifactpath={openPath} className='flex min-h-0 flex-1 flex-col'>
        <div className='flex items-center gap-2 border-b px-2 py-2'>
          <Button variant='ghost' size='sm' onClick={() => onOpenPath(null)} className='text-muted-foreground'>
            <ChevronLeftIcon data-icon='inline-start' />
            {t('artifacts_back')}
          </Button>
          <span className='min-w-0 flex-1 truncate font-heading text-sm font-semibold'>{openArtifact?.title}</span>
          {openArtifact && (
            <Button variant='ghost' size='icon-sm' aria-label={t('artifacts_open_new_tab')} title={t('artifacts_open_new_tab')} nativeButton={false} render={<a href={getVersionedFileUrl(openArtifact)} target='_blank' rel='noreferrer' />}>
              <ExternalLinkIcon />
            </Button>
          )}
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-6'>
            {/* Not in a freshly fetched list: the file is gone. */}
            {openArtifact
              ? <ArtifactViewer artifact={openArtifact} conversationId={conversationId} fileUrl={getVersionedFileUrl(openArtifact)} />
              : <p className='py-10 text-center text-sm text-muted-foreground'>{t('artifact_load_failed')}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (_.isEmpty(artifacts)) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center px-6 text-center'>
        <FilesIcon className='mb-3 size-6 text-muted-foreground' />
        <p className='font-medium'>{t('artifacts_empty_title')}</p>
        <p className='mt-1 max-w-xs text-sm text-muted-foreground'>{t('artifacts_empty_body')}</p>
      </div>
    );
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto'>
      <ItemGroup className='mx-auto w-full max-w-3xl gap-2 px-4 py-6'>
        {/* What these files are, for people who've never seen a spec: they come from the chat, and the site is built from them. */}
        <div data-component='artifacts-intro' className='mb-2 flex gap-3 rounded-xl bg-accent/60 p-4 text-sm'>
          <ClipboardListIcon className='mt-0.5 size-4.5 shrink-0 text-primary' />
          <div>
            <p className='font-semibold'>{t('artifacts_intro_title')}</p>
            <p className='mt-0.5 text-muted-foreground'>{t('artifacts_intro_body')}</p>
          </div>
        </div>
        {_.map(artifacts, artifact => (
          <Item
            key={artifact.path}
            variant='outline'
            data-artifactpath={artifact.path}
            render={<button type='button' onClick={() => onOpenPath(artifact.path)} />}
            className='bg-card text-left text-sm hover:bg-muted'
          >
            <ItemMedia variant='icon'><ArtifactIcon mime={artifact.mime} /></ItemMedia>
            <ItemContent className='min-w-0'>
              <ItemTitle className='truncate'>{artifact.title}</ItemTitle>
              {_SPEC_DESCRIPTION_KEYS[artifact.name] && (
                <ItemDescription>{t(_SPEC_DESCRIPTION_KEYS[artifact.name])}</ItemDescription>
              )}
              <ItemDescription className='truncate text-xs'>{artifact.name} · {formatFileSize(artifact.size)}</ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}
