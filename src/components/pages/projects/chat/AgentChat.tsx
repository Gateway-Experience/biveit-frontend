import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { Marker, MarkerContent, MarkerIcon } from 'src/components/shadui/marker';
import {
  MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider,
  MessageScrollerViewport, useMessageScroller, useMessageScrollerScrollable,
} from 'src/components/shadui/message-scroller';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/shadui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/components/shadui/tabs';
import ArtifactsPanel from 'src/components/pages/projects/chat/ArtifactsPanel';
import ChatComposer from 'src/components/pages/projects/chat/ChatComposer';
import ChatMessageItem, { hasVisibleContent, type ChatRenderContext } from 'src/components/pages/projects/chat/ChatMessageItem';
import QuestionPanel from 'src/components/pages/projects/chat/QuestionPanel';
import useAgentChat from 'src/components/pages/projects/chat/useAgentChat';
import { indexToolResults, indexToolUses } from 'src/services/chatLog';

const _SUGGESTION_KEYS = ['chat_suggestion_landing', 'chat_suggestion_portfolio', 'chat_suggestion_event'];

// Readable column inside a box of any width. Shared by the transcript and the composer so they line up.
const _COLUMN_CLASS = 'mx-auto w-full max-w-3xl px-4';

// The registry's scroller items use `content-visibility: auto` with a 160px placeholder height, so
// messages never drawn yet (everything above the fold on load) count as 160px until scrolled to. Real
// chat messages are mostly 25–60px, so the content kept shrinking under the user while scrolling up —
// scrolling felt short and kept dragging back down until everything had been drawn once. Chat lists are
// small (paged), so the optimisation isn't worth it here: always draw them at their real size.
const _SCROLLER_ITEM_CLASS = '[content-visibility:visible] [contain-intrinsic-size:none]';

function ChatEmptyState({ onPickSuggestion, isDisabled }: { onPickSuggestion: (text: string) => void; isDisabled: boolean }) {
  const { t } = useTranslation();

  return (
    <div className='flex flex-1 flex-col items-center justify-center py-10 text-center animate-in fade-in-0 duration-500'>
      <h2 className='font-heading text-xl font-bold tracking-[-0.02em]'>{t('chat_empty_title')}</h2>
      <p className='mt-2 max-w-sm text-sm text-muted-foreground'>{t('chat_empty_body')}</p>
      <div className='mt-6 flex flex-wrap justify-center gap-2'>
        {_.map(_SUGGESTION_KEYS, key => (
          <button
            key={key}
            type='button'
            disabled={isDisabled}
            onClick={() => onPickSuggestion(t(key))}
            className='rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-50'
          >
            {t(key)}
          </button>
        ))}
      </div>
    </div>
  );
}

// The send path, wrapped so that sending also jumps to the latest (you'll want to see your own message
// even if you'd scrolled up). Lives inside the scroller's provider so it can reach `scrollToEnd`.
type SendText = (text: string, attachmentPaths?: string[]) => Promise<boolean>;

function useSendAndFollow(sendText: SendText): SendText {
  const { scrollToEnd } = useMessageScroller();
  return (text, attachmentPaths) => {
    scrollToEnd({ behavior: 'smooth' });
    return sendText(text, attachmentPaths);
  };
}

function ChatEmptyStateWithSend({ sendText, isDisabled }: { sendText: SendText; isDisabled: boolean }) {
  return <ChatEmptyState onPickSuggestion={useSendAndFollow(sendText)} isDisabled={isDisabled} />;
}

function ChatComposerWithSend({ sendText, ...composerProps }: Omit<ComponentProps<typeof ChatComposer>, 'onSend'> & { sendText: SendText }) {
  return <ChatComposer onSend={useSendAndFollow(sendText)} {...composerProps} />;
}

// Intentions: sits at the top of the transcript and pulls in the previous page once the user has scrolled
// all the way up. The scroller keeps the view anchored while older messages land above it.
function OlderMessagesLoader({ hasOlder, isLoading, hasFailed, onLoad }: {
  hasOlder: boolean;
  isLoading: boolean;
  hasFailed: boolean;
  onLoad: () => void;
}) {
  const { t } = useTranslation();
  const scrollable = useMessageScrollerScrollable();
  // Load when the user can't scroll any further up: either they're at the top, or nothing overflows yet
  // (a short page on a tall screen can't be scrolled at all, so it keeps loading until the view fills or
  // the history runs out). Can fire once on mount before the scroller settles; an extra page is harmless.
  const cannotScrollUp = !scrollable.start;

  useEffect(() => {
    if (cannotScrollUp && hasOlder && !isLoading && !hasFailed) {
      onLoad();
    }
  }, [cannotScrollUp, hasOlder, isLoading, hasFailed, onLoad]);

  if (isLoading) {
    return <div className='flex justify-center'><Spinner className='size-4 text-muted-foreground' /></div>;
  }
  // A failed page isn't retried automatically (it'd loop); the user retries.
  if (hasFailed) {
    return (
      <div className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
        {t('chat_load_older_failed')}
        <Button variant='ghost' size='xs' onClick={onLoad}>{t('chat_load_older_retry')}</Button>
      </div>
    );
  }
  return null;
}

// Original purpose: talking to a project's site-building agent.
// Intentions: fills whatever box it's given (no width or height of its own) — it's a full page column
// today, and is meant to drop into a narrow side panel next to the site preview later.
// Layout: two tabs. Chat = transcript (official message-scroller: follows new messages, jump-to-latest
// button) with the composer — or the agent's open question — pinned underneath. Documents = the files the
// agent wrote; a file card in the chat switches over with that file open.
// Mount with `key={projectId}` (see useAgentChat).
export default function AgentChat({ projectId, className }: { projectId: number; className?: string }) {
  const { t } = useTranslation();
  const {
    conversationId, messages, hasLoadFailed, pendingInteractions, isAgentWorking, isPosting, sendText, submitAnswers,
    uploadFiles, getFileUrl, loadOlderMessages, isLoadingOlder, hasLoadOlderFailed, hasOlder,
  } = useAgentChat(projectId);
  const [activeTab, setActiveTab] = useState<'chat' | 'documents'>('chat');
  // The artifact open in the Documents tab; null = showing the list.
  const [openArtifactPath, setOpenArtifactPath] = useState<string | null>(null);
  // One thing at a time: no sending while history loads, a message is in flight, or the agent is replying.
  // Heads-up: "replying" is inferred from the log (see isAgentPresumedWorking), so if the agent dies
  // without answering, this stays locked until it does.
  const isSendDisabled = _.isNull(messages) || isPosting || isAgentWorking;
  // Answered one at a time if the agent asked several in one go; the next shows once this one's answered.
  const currentInteraction = _.first(pendingInteractions);
  // The agent can revise a document without showing it again, so the Documents list refetches whenever it
  // says anything new.
  const latestAssistantSeq = _.findLast(messages, { role: 'assistant' })?.seq;

  const renderContext = useMemo((): ChatRenderContext => ({
    toolUsesById: indexToolUses(messages || []),
    toolResultsByCallId: indexToolResults(messages || []),
    pendingInteractionIds: _.map(pendingInteractions, 'id'),
    isAgentWorking,
    getFileUrl,
    onOpenArtifact: path => {
      setOpenArtifactPath(path);
      setActiveTab('documents');
    },
  }), [messages, pendingInteractions, isAgentWorking, getFileUrl]);
  const visibleMessages = useMemo(
    () => _.filter(messages, message => hasVisibleContent(message, renderContext.toolUsesById)),
    [messages, renderContext],
  );

  if (hasLoadFailed) {
    return (
      <div className={cn('flex w-full items-center justify-center p-6 text-center text-sm text-muted-foreground', className)}>
        {t('chat_load_failed')}
      </div>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      data-component='agent-chat'
      data-projectid={projectId}
      data-agentworking={isAgentWorking}
      className={cn('min-h-0 w-full gap-0', className)}
    >
      <TabsList variant='line' className='w-full justify-start border-b px-3'>
        <TabsTrigger value='chat' className='flex-none px-3'>{t('chat_tab_chat')}</TabsTrigger>
        <TabsTrigger value='documents' className='flex-none px-3'>{t('chat_tab_documents')}</TabsTrigger>
      </TabsList>

      {/* Kept mounted while hidden so the draft, scroll position and any half-answered question survive a
          trip to Documents. */}
      <TabsContent value='chat' keepMounted className='flex min-h-0 flex-col text-base'>
        {/* autoScroll: follow new messages unless the user has scrolled up to read (then the button shows).
          Deliberately no `scrollAnchor` items: the scroller jumps to any anchor it hasn't visited yet,
          and every user message loaded from history counts as one — it'd yank you back to the start. */}
        <MessageScrollerProvider autoScroll>
          <MessageScroller className='min-h-0 flex-1'>
            <MessageScrollerViewport>
              {/* pb-10 = the scroller's bottom fade (`scroll-fade-b`, 40px). Browsers without scroll-driven
                  animations (e.g. Firefox) keep that fade on even when scrolled to the end, so the padding
                  makes sure it only ever covers empty space, never the last message. */}
              <MessageScrollerContent className={cn(_COLUMN_CLASS, 'gap-5 pt-6 pb-10')}>
                <OlderMessagesLoader hasOlder={hasOlder} isLoading={isLoadingOlder} hasFailed={hasLoadOlderFailed} onLoad={loadOlderMessages} />
                {_.isNull(messages) && (
                  <div className='flex flex-1 items-center justify-center'>
                    <Spinner className='size-5 text-muted-foreground' />
                  </div>
                )}
                {/* Empty only if there's truly nothing — not just a newest page with nothing to draw. */}
                {!_.isNull(messages) && _.isEmpty(visibleMessages) && !hasOlder && <ChatEmptyStateWithSend sendText={sendText} isDisabled={isSendDisabled} />}
                {_.map(visibleMessages, message => (
                  <MessageScrollerItem key={message.seq} messageId={String(message.seq)} className={_SCROLLER_ITEM_CLASS}>
                    <ChatMessageItem message={message} renderContext={renderContext} />
                  </MessageScrollerItem>
                ))}
                {isAgentWorking && (
                  <MessageScrollerItem className={_SCROLLER_ITEM_CLASS}>
                    <Marker className='animate-in fade-in-0'>
                      <MarkerIcon><Spinner className='size-3.5' /></MarkerIcon>
                      <MarkerContent>{t('chat_working')}</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>

          <div className={cn(_COLUMN_CLASS, 'pt-2 pb-4')}>
            {/* While the agent waits on an answer, the question takes the input's place (the BE refuses text
                until then). The composer stays mounted underneath, just hidden, so a half-typed message and
                its uploaded files are still there once the question is answered or dismissed. */}
            {currentInteraction && <QuestionPanel key={currentInteraction.id} toolUse={currentInteraction} onSubmit={submitAnswers} />}
            <div hidden={Boolean(currentInteraction)}>
              <ChatComposerWithSend
                sendText={sendText}
                onUpload={uploadFiles}
                getFileUrl={getFileUrl}
                isSendDisabled={isSendDisabled}
                // Uploads need the conversation, which only exists once the chat has loaded.
                isAttachDisabled={!conversationId}
              />
            </div>
          </div>
        </MessageScrollerProvider>
      </TabsContent>

      <TabsContent value='documents' className='flex min-h-0 flex-col text-base'>
        {conversationId && (
          <ArtifactsPanel
            conversationId={conversationId}
            refreshKey={latestAssistantSeq}
            openPath={openArtifactPath}
            onOpenPath={setOpenArtifactPath}
            getFileUrl={getFileUrl}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
