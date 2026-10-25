import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { TriangleAlertIcon } from 'lucide-react';

import { Marker, MarkerContent, MarkerIcon } from 'src/components/shadui/marker';
import {
  MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider,
  MessageScrollerViewport, useMessageScroller, useMessageScrollerScrollable,
} from 'src/components/shadui/message-scroller';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/common/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/components/shadui/tabs';
import AgentWaitLine from 'src/components/pages/projects/chat/AgentWaitLine';
import ArtifactsPanel from 'src/components/pages/projects/chat/ArtifactsPanel';
import BuildProgressPanel from 'src/components/pages/projects/chat/BuildProgressPanel';
import { BuildGlyph } from 'src/components/pages/projects/preview/BuildIndicator';
import ChatComposer from 'src/components/pages/projects/chat/ChatComposer';
import InteractionPanel from 'src/components/pages/projects/chat/InteractionPanel';
import ChatMessageItem, { hasVisibleContent, StartingBriefMessage, type ChatRenderContext } from 'src/components/pages/projects/chat/ChatMessageItem';
import type useAgentChat from 'src/components/pages/projects/chat/useAgentChat';
import { getArtifacts } from 'src/services/chat';
import { getAnsweredQuestions, getSuggestedReply, indexToolResults, indexToolUses } from 'src/services/chatLog';
import type { ChatIntroState } from 'src/types/chat';
import type { DevenvBuild } from 'src/types/preview';

// Readable column inside a box of any width. Shared by the transcript and the composer so they line up.
const _COLUMN_CLASS = 'mx-auto w-full max-w-4xl px-4';

// The registry's scroller items use `content-visibility: auto` with a 160px placeholder height, so
// messages never drawn yet (everything above the fold on load) count as 160px until scrolled to. Real
// chat messages are mostly 25–60px, so the content kept shrinking under the user while scrolling up —
// scrolling felt short and kept dragging back down until everything had been drawn once. Chat lists are
// small (paged), so the optimisation isn't worth it here: always draw them at their real size.
const _SCROLLER_ITEM_CLASS = '[content-visibility:visible] [contain-intrinsic-size:none]';

// Intentions: what an empty chat shows while the agent can't have spoken yet — its project is still being
// set up (the first time takes a while), or setting it up failed and the user can try again. Once the
// session is up the agent opens the conversation itself; until then the "working" marker covers it.
function ChatSetupState({ introState, onRetry }: { introState: ChatIntroState; onRetry: () => void }) {
  const { t } = useTranslation();

  if (introState === 'setting-up') {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center animate-in fade-in-0 duration-500'>
        <Spinner className='size-6 text-brand-strong' />
        <p className='font-medium'>{t('chat_setting_up')}</p>
        <p className='max-w-xs text-sm text-muted-foreground'>{t('chat_setting_up_hint')}</p>
      </div>
    );
  }
  if (introState === 'agent-overdue') {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center'>
        <p className='font-medium'>{t('chat_agent_overdue')}</p>
        <p className='max-w-xs text-sm text-muted-foreground'>{t('chat_agent_overdue_hint')}</p>
        <Button variant='outline' onClick={onRetry}>{t('chat_setup_retry')}</Button>
      </div>
    );
  }
  if (introState === 'setup-failed') {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center'>
        <p className='font-medium'>{t('chat_setup_failed')}</p>
        <Button variant='outline' onClick={onRetry}>{t('chat_setup_retry')}</Button>
      </div>
    );
  }
  return null;
}

// Intentions: the chat can't reach the agent, and here's the one button that fixes it — instead of leaving the
// user to guess (people typed "retry" into the chat). Two cases: a message that was stored but didn't get
// through (try again = hand it over again), and the project failing to open with the chat already going
// (try again = open it again).
function ChatRetryBanner({ messageKey, isRetrying, onRetry }: { messageKey: string; isRetrying: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role='alert' data-component='chat-retry' className='mb-2 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm animate-in fade-in-0'>
      <TriangleAlertIcon className='size-4 shrink-0 text-destructive' />
      <p className='flex-1'>{t(messageKey)}</p>
      <Button size='sm' variant='outline' disabled={isRetrying} onClick={onRetry} className='shrink-0 bg-card'>
        {isRetrying && <Spinner data-icon='inline-start' />}
        {t('chat_setup_retry')}
      </Button>
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

// Ways out of the agent's questions that also say something (see InteractionPanel): dismiss, then send
// `text`, following the chat to the end like any send.
function InteractionPanelWithSend({ sendText, submitAnswers, ...panelProps }: Omit<ComponentProps<typeof InteractionPanel>, 'onSubmit' | 'onDismissAndSay'> & {
  sendText: SendText;
  submitAnswers: ComponentProps<typeof InteractionPanel>['onSubmit'];
}) {
  const sendAndFollow = useSendAndFollow(sendText);
  return (
    <InteractionPanel
      onSubmit={submitAnswers}
      onDismissAndSay={async (answers, text) => (await submitAnswers(answers)) && sendAndFollow(text)}
      {...panelProps}
    />
  );
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

type AgentChatTab = 'chat' | 'documents' | 'preview' | 'deploy';

// Original purpose: talking to a project's site-building agent.
// Intentions: fills whatever box it's given (no width or height of its own) — a full page column while
// spec-ing, a side panel next to the site preview once building.
// Layout: tabs. Chat = transcript (official message-scroller: follows new messages, jump-to-latest
// button) with the composer — or the agent's open question — pinned underneath. Documents = the files the
// agent wrote; a file card in the chat switches over with that file open. Preview = whatever `preview` is
// given, as a tab of its own — for screens too narrow to show it beside the chat. Deploy = likewise
// `deploy`, once there's a finished site to publish.
// The chat's state comes from the parent (`useAgentChat`), which also needs it to lay the page out.
export default function AgentChat({ projectId, bootstrapData, chat, onRetrySession, isRetryingSession = false, preview, activeBuild = null, deploy, className }: {
  projectId: number;
  // The new-project form's answers (project.bootstrap_data): shown as the user's first message.
  bootstrapData: Record<string, unknown>;
  chat: ReturnType<typeof useAgentChat>;
  // Opens the project again after it failed to (see useProjectSession), and whether that's under way.
  onRetrySession: () => void;
  isRetryingSession?: boolean;
  preview?: ReactNode;
  // The build in progress (useActiveBuild), if any: the Preview tab gets a twinkle so it's noticed from the
  // chat, and a loading bar takes the input's place.
  activeBuild?: DevenvBuild | null;
  deploy?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const isPreviewBuilding = !!activeBuild;
  const {
    conversationId, latestAssistantSeq, messages, introState, hasLoadFailed, pendingInteractions, isAgentWorking, isPosting,
    sendText, submitAnswers, uploadFiles, getFileUrl, loadOlderMessages, isLoadingOlder, hasLoadOlderFailed, hasOlder,
    hasUndeliveredMessage, resendUndelivered, isResending, isSessionDown,
  } = chat;
  const [selectedTab, setSelectedTab] = useState<AgentChatTab>('chat');
  // Preview and Deploy can go away while selected (e.g. the window got wider and they moved beside the
  // chat): fall back to chat.
  const activeTab = (selectedTab === 'preview' && !preview) || (selectedTab === 'deploy' && !deploy) ? 'chat' : selectedTab;
  // The artifact open in the Documents tab; null = showing the list.
  const [openArtifactPath, setOpenArtifactPath] = useState<string | null>(null);
  // Names of the agent's documents so far: the question panel's encouragement follows the planning progress.
  // Re-read whenever the agent says something new, since that's when a document can appear.
  const [specDocNames, setSpecDocNames] = useState<string[]>([]);
  useEffect(() => {
    if (!conversationId) {
      return;
    }
    let isStale = false;
    getArtifacts(conversationId)
      .then(artifacts => !isStale && setSpecDocNames(_.map(artifacts, 'name')))
      // Only for encouragement: without it, the panel simply says less.
      .catch(_.noop);
    return () => {
      isStale = true;
    };
  }, [conversationId, latestAssistantSeq]);
  const answeredQuestions = useMemo(() => getAnsweredQuestions(messages || []), [messages]);
  const suggestedReply = useMemo(() => getSuggestedReply(messages || []), [messages]);
  // One thing at a time: no sending while history loads, a message is in flight, or the agent is replying.
  // "Replying" is read off the log (see isAgentWorking): the same in every tab and after a reload, and a turn
  // that never ends unlocks once it's been silent too long.
  // Nor before the conversation has started: the agent speaks first, once its project is set up.
  const isSendDisabled = introState !== 'started' || isPosting || isAgentWorking;

  const renderContext = useMemo((): ChatRenderContext => ({
    toolUsesById: indexToolUses(messages || []),
    toolResultsByCallId: indexToolResults(messages || []),
    pendingInteractionIds: _.map(pendingInteractions, 'id'),
    isAgentWorking,
    getFileUrl,
    onOpenArtifact: path => {
      setOpenArtifactPath(path);
      setSelectedTab('documents');
    },
  }), [messages, pendingInteractions, isAgentWorking, getFileUrl]);
  const visibleMessages = useMemo(
    () => _.filter(messages, message => hasVisibleContent(message, renderContext.toolUsesById)),
    [messages, renderContext],
  );

  const isWaitingForUser = introState === 'started' && !isAgentWorking && !isPosting && _.isEmpty(pendingInteractions)
    && _.last(visibleMessages)?.role === 'assistant';

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
      onValueChange={setSelectedTab}
      data-component='agent-chat'
      data-projectid={projectId}
      data-agentworking={isAgentWorking}
      className={cn('min-h-0 w-full gap-0', className)}
    >
      <TabsList variant='line' className='w-full justify-start border-b px-3'>
        <TabsTrigger value='chat' className='flex-none px-3'>{t('chat_tab_chat')}</TabsTrigger>
        <TabsTrigger value='documents' className='flex-none px-3'>{t('chat_tab_documents')}</TabsTrigger>
        {preview && (
          <TabsTrigger value='preview' className='flex-none px-3' data-building={isPreviewBuilding || undefined}>
            {t('chat_tab_preview')}
            {isPreviewBuilding && <BuildGlyph className='text-base' />}
          </TabsTrigger>
        )}
        {deploy && <TabsTrigger value='deploy' className='flex-none px-3'>{t('chat_tab_deploy')}</TabsTrigger>}
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
                {/* Only once the history reaches back to its start: above a partial page it'd be out of order. It
                    shows right away on a new project too, so the user sees what the agent is working from. */}
                {!_.isNull(messages) && !hasOlder && (
                  <MessageScrollerItem className={_SCROLLER_ITEM_CLASS}>
                    <StartingBriefMessage bootstrapData={bootstrapData} />
                  </MessageScrollerItem>
                )}
                <ChatSetupState introState={introState} onRetry={onRetrySession} />
                {/* The avatar goes on the first message of each run from one side. The starting brief counts as the
                    user's, when it's shown (the whole history is loaded). */}
                {_.map(visibleMessages, (message, index) => (
                  <MessageScrollerItem key={message.seq} messageId={String(message.seq)} className={_SCROLLER_ITEM_CLASS}>
                    <ChatMessageItem message={message} renderContext={renderContext} hasAvatar={(index ? visibleMessages[index - 1].role : !hasOlder && 'user') !== message.role} />
                  </MessageScrollerItem>
                ))}
                {/* The agent's done and it's the user's move: a quiet pill under its last bubble (offset past the
                    avatar), so it's clear the chat is waiting on them. Questions waiting for an answer carry their own. */}
                {isWaitingForUser && (
                  <MessageScrollerItem className={_SCROLLER_ITEM_CLASS}>
                    <div data-component='chat-waiting-for-user' className='-mt-2 pl-[2.625rem]'>
                      <span className='inline-flex items-center gap-2.5 rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-ink shadow-md shadow-brand-light/40 animate-in fade-in-0 slide-in-from-bottom-1 duration-500'>
                        {/* A pinging dot: the "it's your turn" cue that catches the eye without moving the layout. In
                            the logo's lavender, on the lime pill. */}
                        <span className='relative flex size-2.5'>
                          <span className='absolute inline-flex size-full animate-ping rounded-full bg-brand-lavender opacity-75' />
                          <span className='relative inline-flex size-2.5 rounded-full bg-brand-lavender' />
                        </span>
                        {t('chat_waiting_for_answer')}
                      </span>
                    </div>
                  </MessageScrollerItem>
                )}
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
            {/* While the agent waits on an answer, the question (or action) takes the input's place (the BE refuses text
                until then). The composer stays mounted underneath, just hidden, so a half-typed message and
                its uploaded files are still there once the question is answered or dismissed. */}
            {hasUndeliveredMessage && (
              <ChatRetryBanner messageKey='chat_delivery_failed' isRetrying={isResending} onRetry={resendUndelivered} />
            )}
            {(isSessionDown || (isRetryingSession && introState === 'started')) && (
              <ChatRetryBanner messageKey='chat_session_down' isRetrying={isRetryingSession} onRetry={onRetrySession} />
            )}
            {activeBuild && _.isEmpty(pendingInteractions) && <BuildProgressPanel since={activeBuild.since} />}
            {!_.isEmpty(pendingInteractions) && (
              <InteractionPanelWithSend
                key={_.map(pendingInteractions, 'id').join(',')}
                interactions={pendingInteractions}
                submitAnswers={submitAnswers}
                sendText={sendText}
                answeredQuestions={answeredQuestions}
                specDocNames={specDocNames}
              />
            )}
            {/* Hidden (not unmounted) while building too: the build panel takes its place, and the draft survives. */}
            <div hidden={!_.isEmpty(pendingInteractions) || isPreviewBuilding}>
              {isAgentWorking && <AgentWaitLine isBuilding={false} />}
              <ChatComposerWithSend
                sendText={sendText}
                onUpload={uploadFiles}
                getFileUrl={getFileUrl}
                isSendDisabled={isSendDisabled}
                // Uploads need the conversation, which only exists once the chat has loaded.
                isAttachDisabled={!conversationId}
                // Not while it couldn't be sent anyway (e.g. the agent is still replying).
                suggestedReply={isSendDisabled ? null : suggestedReply}
              />
            </div>
          </div>
        </MessageScrollerProvider>
      </TabsContent>

      <TabsContent value='documents' className='flex min-h-0 flex-col text-base'>
        {/* The agent can revise a document without showing it again, so the list refetches whenever it
            says anything new. */}
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

      {/* Kept mounted so switching tabs doesn't reload the site or lose where it was. */}
      {preview && <TabsContent value='preview' keepMounted className='flex min-h-0 flex-col'>{preview}</TabsContent>}
      {deploy && <TabsContent value='deploy' className='flex min-h-0 flex-col'>{deploy}</TabsContent>}
    </Tabs>
  );
}
