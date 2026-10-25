import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  CheckIcon, ChevronRightIcon, FileTextIcon, MessageCircleQuestionIcon, ThumbsUpIcon, TriangleAlertIcon, XIcon,
} from 'lucide-react';
import { cn } from 'cn';

import AgentAvatar from 'src/components/common/AgentAvatar';
import Markdown from 'src/components/common/Markdown';
import UserAvatar from 'src/components/common/UserAvatar';
import ChatAttachment from 'src/components/pages/projects/chat/ChatAttachment';
import { CHAT_TEXT_SIZE_CLASS } from 'src/components/pages/projects/chat/chatStyles';
import {
  Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger,
} from 'src/components/shadui/attachment';
import { Bubble, BubbleContent } from 'src/components/shadui/bubble';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'src/components/shadui/collapsible';
import { Marker, MarkerContent, MarkerIcon } from 'src/components/shadui/marker';
import { Message, MessageAvatar, MessageContent } from 'src/components/shadui/message';
import { Spinner } from 'src/components/common/Spinner';
import { APPROVAL_ACTION_TEXT_KEYS, flattenInteractionItems, type InteractionItem } from 'src/services/chatInteractions';
import { getInteractionResults, isAskUser, isShowArtifact, isUserFacingTool } from 'src/services/chatLog';
import { formatDateTime } from 'src/utils/common';
import { useStore } from 'src/state-store';
import { SITE_KIND_OPTIONS } from 'src/utils/constants';
import type {
  AiMessage, AttachmentBlock, ContentBlock, InteractionResult, SignalBlock, TextBlock, ToolResultBlock,
  ToolUseBlock,
} from 'src/types/chat';

// What a message needs to know about the rest of the log to render itself.
export type ChatRenderContext = {
  toolUsesById: Record<string, ToolUseBlock>;
  toolResultsByCallId: Record<string, ToolResultBlock>;
  pendingInteractionIds: string[];
  isAgentWorking: boolean;
  getFileUrl: (path: string) => string;
  // Switches to the Documents tab with that artifact open.
  onOpenArtifact: (path: string) => void;
};

// The registry's bubbles are sized for dense UIs (text-xs); chat reads better a notch above the UI's
// usual text-sm. Same size on both sides of the conversation (see CHAT_TEXT_SIZE_CLASS).
const _USER_BUBBLE_CONTENT_CLASS = cn('rounded-2xl px-4 py-2.5', CHAT_TEXT_SIZE_CLASS);
// A dashed line above a part of a bubble, setting it apart from what comes before it.
const _DASHED_DIVIDER_CLASS = 'border-t border-dashed border-foreground/35';
// The agent writes markdown; Markdown's prose spacing is in em, so it scales along with the bigger size.
const _AGENT_TEXT_CLASS = cn('w-full', CHAT_TEXT_SIZE_CLASS);

// Signals are markers, not chat (see SignalBlock), so they stay hidden — except these, which the user should
// know about, shown as a quiet notice line.
const _NOTICE_SIGNAL_KEYS: Record<string, string> = {
  DEVENV_FAILED: 'chat_signal_devenv_failed',
};

// Intentions: a chat bubble that tells when it was sent, but only when asked: tapping it (or Enter/Space on
// it) shows the time under it, tapping again hides it. A tap that ends a text selection isn't a toggle, so
// copying a bit of a message doesn't flip it, and neither is one on a link or a control inside the bubble
// (the agent's file cards, its tool rows). Used for the user's messages and the agent's framed replies.
function TimedBubble({ sentAt, variant, align = 'start', contentClassName, children, ...dataProps }: {
  sentAt: string;
  variant: React.ComponentProps<typeof Bubble>['variant'];
  align?: 'start' | 'end';
  contentClassName?: string;
  children: React.ReactNode;
} & Record<`data-${string}`, string | undefined>) {
  const { i18n } = useTranslation();
  const [isTimeShown, setIsTimeShown] = useState(false);

  const toggleTime = (target: EventTarget, bubbleContent: EventTarget) => {
    const control = (target as Element).closest?.('a, button, input, textarea, [role=button]');
    if (!_.isEmpty(_.toString(window.getSelection())) || (control && control !== bubbleContent)) {
      return;
    }
    setIsTimeShown(!isTimeShown);
  };

  return (
    <Bubble variant={variant} align={align} {...dataProps}>
      <BubbleContent
        role='button'
        tabIndex={0}
        aria-expanded={isTimeShown}
        onClick={event => toggleTime(event.target, event.currentTarget)}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
            event.preventDefault();
            toggleTime(event.target, event.currentTarget);
          }
        }}
        className={cn('cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/30', contentClassName)}
      >
        {children}
      </BubbleContent>
      {isTimeShown && (
        <time
          dateTime={sentAt}
          data-component='chat-message-time'
          className={cn('px-1 text-xs text-muted-foreground animate-in fade-in-0 duration-200', align === 'end' && 'self-end')}
        >
          {formatDateTime(sentAt, i18n.language)}
        </time>
      )}
    </Bubble>
  );
}

const _isTextBlock = (block: ContentBlock): block is TextBlock => block.type === 'text';
const _isAttachmentBlock = (block: ContentBlock): block is AttachmentBlock => block.type === 'attachment';
const _isToolUseBlock = (block: ContentBlock): block is ToolUseBlock => block.type === 'tool_use';
const _isToolResultBlock = (block: ContentBlock): block is ToolResultBlock => block.type === 'tool_result';
const _isNoticeSignalBlock = (block: ContentBlock): block is SignalBlock => block.type === 'signal'
  && _.has(_NOTICE_SIGNAL_KEYS, (block as SignalBlock).slug);

function _summarizeToolInput(input: Record<string, unknown>) {
  // Most tools have one obvious string arg (a path, a query...), which is all the collapsed row needs.
  return _.truncate(_.find(_.values(input), _.isString) as string | undefined, { length: 60 });
}

// The agent's `ask_user` / `request_actions` call, as it sits in the log: a section at the bottom of its
// reply's frame with what it asked (the questions, or the go-ahead it wants). The options to pick from are
// in the panel that replaces the composer while it's pending, and the answers show up as the user's reply.
function InteractionSection({ toolUse, isPending }: { toolUse: ToolUseBlock; isPending: boolean }) {
  const { t } = useTranslation();
  const items = flattenInteractionItems([toolUse]);

  return (
    // The dashed line only when something comes before it in the frame.
    <div data-toolcallid={toolUse.id} className={cn('flex flex-col gap-2 not-first:pt-3', 'not-first:border-t not-first:border-dashed not-first:border-foreground/35')}>
      <span className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
        {isAskUser(toolUse) ? <MessageCircleQuestionIcon className='size-3.5' /> : <ThumbsUpIcon className='size-3.5' />}
        {isAskUser(toolUse) ? t('chat_asked_questions', { count: _.size(items) }) : t('chat_requested_actions')}
        {isPending && <span className='rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground'>{t('chat_waiting_for_answer')}</span>}
      </span>
      {_.map(items, (item, index) => (
        <span key={index} className='font-medium'>{_getItemLabel(item, t)}</span>
      ))}
    </div>
  );
}

// The agent pointing at one of its files. Opens it in the Documents tab (in place of the chat); always
// the latest version, since revisions overwrite the same path.
function ShowArtifactCard({ toolUse, onOpenArtifact }: { toolUse: ToolUseBlock; onOpenArtifact: (path: string) => void }) {
  const { t } = useTranslation();
  const { path, title } = toolUse.input as { path: string; title: string };

  return (
    <Attachment data-toolcallid={toolUse.id} data-artifactpath={path} className='min-w-56'>
      <AttachmentMedia><FileTextIcon /></AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle className='text-sm'>{title}</AttachmentTitle>
        <AttachmentDescription>{t('artifact_open_in_documents')}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentTrigger aria-label={title} onClick={() => onOpenArtifact(path)} />
    </Attachment>
  );
}

// A notice the agent's side put in the log (e.g. the preview environment failing to set up): one quiet line,
// the details (the BE's reason) on hover.
function SignalNotice({ signal }: { signal: SignalBlock }) {
  const { t } = useTranslation();
  return (
    <Marker variant='separator' data-signal={signal.slug} title={signal.description}>
      <MarkerIcon><TriangleAlertIcon /></MarkerIcon>
      <MarkerContent>{t(_NOTICE_SIGNAL_KEYS[signal.slug])}</MarkerContent>
    </Marker>
  );
}

// What an answered item is labelled with in the answer card: the question as asked, or the action's title.
// No item = its call is in a page of history that isn't loaded.
function _getItemLabel(item: InteractionItem | undefined, t: TFunction) {
  if (item?.kind === 'action') {
    return t(APPROVAL_ACTION_TEXT_KEYS[item.action.name]?.title || 'chat_action_unknown_title');
  }
  return item?.question.question;
}

// What an item the user set aside reads as: an approval they put off says so in its own words ("Build later"),
// a question just reads as dismissed.
function _getSetAsideText(item: InteractionItem | undefined, t: TFunction) {
  const laterKey = item?.kind === 'action' ? APPROVAL_ACTION_TEXT_KEYS[item.action.name]?.later : null;
  return t(laterKey || 'chat_answer_dismissed');
}

// What a submitted answer reads as: the picked options (and custom text), or the approval button clicked.
function _getSubmittedAnswerText(result: Extract<InteractionResult, { status: 'submitted' }>, t: TFunction) {
  if ('decision' in result.value) {
    return t(result.value.decision === 'approved' ? 'chat_answer_approved' : 'chat_action_iterate');
  }
  return _.join(_.compact([...result.value.selected, result.value.custom]), ', ') || t('chat_answer_none');
}

// The user's answers, shown as their side of the conversation: each answered question (or action) with what
// they picked. One answer message can cover several calls (everything pending is answered in one go), so it's
// one card for all of them, in the order asked. A dismiss shows where the user bailed out; items they never
// reached are left out.
function InteractionAnswerBubble({ answers, sentAt }: {
  answers: { toolResult: ToolResultBlock; toolUse?: ToolUseBlock }[];
  sentAt: string;
}) {
  const { t } = useTranslation();
  const answeredItems = _.flatMap(answers, ({ toolResult, toolUse }) => {
    const items = toolUse ? flattenInteractionItems([toolUse]) : [];
    return _.map(getInteractionResults(toolResult), (result, index) => ({
      key: `${toolResult.tool_use_id}:${index}`,
      item: items[index] as InteractionItem | undefined,
      label: _getItemLabel(items[index] as InteractionItem | undefined, t),
      result,
    }));
  });

  return (
    <TimedBubble
      variant='secondary'
      align='end'
      sentAt={sentAt}
      data-toolresultfor={_.map(answers, 'toolResult.tool_use_id').join(',')}
      contentClassName={cn(_USER_BUBBLE_CONTENT_CLASS, 'flex flex-col gap-2 p-2')}
    >
      {/* One light tile per question, so several answers in one card don't run together. */}
      {_.map(_.reject(answeredItems, { result: { status: 'untouched' } }), ({ key, item, label, result }) => (
        <div key={key} data-answeritem={key} className='flex flex-col rounded-xl bg-background/60 px-3 py-2'>
          <span className='pb-1.5 text-sm text-muted-foreground'>{label}</span>
          <span className={cn('pt-1.5 font-medium', _DASHED_DIVIDER_CLASS, result.status === 'aborted' && 'font-normal text-muted-foreground italic')}>
            {result.status === 'submitted' ? _getSubmittedAnswerText(result, t) : _getSetAsideText(item, t)}
          </span>
        </div>
      ))}
    </TimedBubble>
  );
}

function ToolCallStatusIcon({ toolResult, isAgentWorking }: { toolResult?: ToolResultBlock; isAgentWorking: boolean }) {
  if (toolResult?.is_error) {
    return <XIcon className='text-destructive' />;
  }
  if (toolResult) {
    return <CheckIcon className='text-success' />;
  }
  // No result yet: still running while the agent works, otherwise the run ended without one.
  return isAgentWorking ? <Spinner className='size-3.5' /> : <span className='block size-1.5 rounded-full bg-muted-foreground' />;
}

// Intentions: a regular (not user-facing) tool call is noise most of the time, so it's a marker line
// (status + name + main argument) that expands to show the raw input and result for the curious.
// This is for when the real agent's own tool calls come through.
function ToolCallMarker({ toolUse, toolResult, isAgentWorking }: {
  toolUse: ToolUseBlock;
  toolResult?: ToolResultBlock;
  isAgentWorking: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Collapsible data-toolcallid={toolUse.id}>
      <CollapsibleTrigger className='group w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30'>
        <Marker render={<span />}>
          <MarkerIcon className='flex items-center justify-center'>
            <ToolCallStatusIcon toolResult={toolResult} isAgentWorking={isAgentWorking} />
          </MarkerIcon>
          <MarkerContent className='truncate'>
            <span className='font-mono font-medium text-foreground'>{toolUse.name}</span> <span className='font-mono'>{_summarizeToolInput(toolUse.input)}</span>
          </MarkerContent>
          <ChevronRightIcon className='transition-transform group-data-[panel-open]:rotate-90' />
        </Marker>
      </CollapsibleTrigger>
      <CollapsibleContent className='mt-2 flex flex-col gap-2 rounded-lg border bg-card p-3 text-xs'>
        <span className='text-[0.625rem] font-bold tracking-[0.14em] text-muted-foreground uppercase'>{t('chat_tool_input')}</span>
        <pre className='overflow-x-auto rounded-md bg-muted p-2 font-mono whitespace-pre-wrap'>{JSON.stringify(toolUse.input, null, 2)}</pre>
        {toolResult && (
          <>
            <span className='text-[0.625rem] font-bold tracking-[0.14em] text-muted-foreground uppercase'>{t('chat_tool_result')}</span>
            <pre className={cn('overflow-x-auto rounded-md bg-muted p-2 font-mono whitespace-pre-wrap', toolResult.is_error && 'text-destructive')}>
              {_.isString(toolResult.content) ? toolResult.content : JSON.stringify(toolResult.content, null, 2)}
            </pre>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function UserMessageBlocks({ message, renderContext }: { message: AiMessage; renderContext: ChatRenderContext }) {
  // Attachments come first in a user message; they sit together in one row above the text.
  const attachmentBlocks = _.filter(message.content, _isAttachmentBlock);
  const attachmentRow = !_.isEmpty(attachmentBlocks) && (
    <div key='attachments' className='flex max-w-[85%] flex-wrap items-end justify-end gap-2 self-end'>
      {_.map(attachmentBlocks, block => (
        <ChatAttachment key={block.path} name={block.name} mime={block.mime} size={block.size} url={renderContext.getFileUrl(block.path)} />
      ))}
    </div>
  );

  // Answers to the agent's questions/actions share one card; results of its other tools render under the call.
  const answers = _.filter(
    _.map(_.filter(message.content, _isToolResultBlock), toolResult => ({ toolResult, toolUse: renderContext.toolUsesById[toolResult.tool_use_id] })),
    ({ toolUse }) => isUserFacingTool(toolUse),
  );
  const answerCard = !_.isEmpty(answers) && <InteractionAnswerBubble key='answers' answers={answers} sentAt={message.created_at} />;

  return [attachmentRow, answerCard, ..._.map(_.filter(message.content, _isTextBlock), (block, index) => (
    <TimedBubble
      key={index}
      variant='secondary'
      align='end'
      sentAt={message.created_at}
      contentClassName={cn(_USER_BUBBLE_CONTENT_CLASS, 'whitespace-pre-wrap')}
    >
      {block.text}
    </TimedBubble>
  ))];
}

const _isInteractionBlock = (block: ContentBlock): block is ToolUseBlock => _isToolUseBlock(block)
  && isUserFacingTool(block) && !isShowArtifact(block);

// One of the agent's blocks other than its questions: text, a file card, a notice, or a tool row.
function AssistantBlock({ block, renderContext }: { block: ContentBlock; renderContext: ChatRenderContext }) {
  if (_isTextBlock(block)) {
    return <Markdown className={_AGENT_TEXT_CLASS} options={{ keepsLineBreaks: true }}>{block.text}</Markdown>;
  }
  if (_isToolUseBlock(block) && isShowArtifact(block)) {
    return <ShowArtifactCard toolUse={block} onOpenArtifact={renderContext.onOpenArtifact} />;
  }
  if (_isNoticeSignalBlock(block)) {
    return <SignalNotice signal={block} />;
  }
  if (_isToolUseBlock(block)) {
    return <ToolCallMarker toolUse={block} toolResult={renderContext.toolResultsByCallId[block.id]} isAgentWorking={renderContext.isAgentWorking} />;
  }
  // Unknown block types (and the other signals) are skipped — the BE's set keeps growing.
  return null;
}

// [Pure] The agent's blocks cut into bubbles: every text block after the first starts a new one (the runner
// splits a long reply into several text blocks where the agent asked for a break), and whatever follows a
// text (a file card, a tool row) stays in its bubble.
const _groupIntoBubbles = (blocks: ContentBlock[]) => _.reduce(blocks, (groups, block) => (
  _.isEmpty(groups) || (_isTextBlock(block) && _.some(_.last(groups), _isTextBlock))
    ? [...groups, [block]]
    : [..._.initial(groups), [..._.last(groups)!, block]]
), [] as ContentBlock[][]);

// Intentions: a reply that says something (text) or asks something sits in frames, one per text block, its
// questions last in the last frame, under a dashed line. A message that's only the agent at work (tool rows,
// notices) stays unframed: those are progress, not a reply.
function AssistantMessageBlocks({ message, renderContext }: { message: AiMessage; renderContext: ChatRenderContext }) {
  const [interactionBlocks, otherBlocks] = _.partition(message.content, _isInteractionBlock);
  const toNodes = (blocks: ContentBlock[]) => _.map(blocks, (block, index) => (
    <AssistantBlock key={_isToolUseBlock(block) ? block.id : index} block={block} renderContext={renderContext} />
  ));

  if (_.isEmpty(interactionBlocks) && !_.some(otherBlocks, _isTextBlock)) {
    return toNodes(otherBlocks);
  }
  // A question-only reply still gets its one frame.
  const bubbleGroups = _.isEmpty(otherBlocks) ? [[]] : _groupIntoBubbles(otherBlocks);
  return _.map(bubbleGroups, (blocks, groupIndex) => (
    <TimedBubble
      key={groupIndex}
      variant='muted'
      sentAt={message.created_at}
      data-component='agent-reply'
      contentClassName={cn(_USER_BUBBLE_CONTENT_CLASS, 'flex flex-col gap-3 py-3')}
    >
      {toNodes(blocks)}
      {groupIndex === _.size(bubbleGroups) - 1 && _.map(interactionBlocks, block => (
        <InteractionSection key={block.id} toolUse={block} isPending={_.includes(renderContext.pendingInteractionIds, block.id)} />
      ))}
    </TimedBubble>
  ));
}

// [Pure] Whether a message has anything to draw. Users' messages carrying only results of regular tool
// calls don't (those show under the call), and neither do signals (bar the notices) or messages made of
// unknown blocks.
function hasVisibleContent(message: AiMessage, toolUsesById: Record<string, ToolUseBlock>) {
  return _.some(message.content, block => _isTextBlock(block)
    || (message.role === 'user' && _isAttachmentBlock(block))
    || (message.role === 'assistant' && (_isToolUseBlock(block) || _isNoticeSignalBlock(block)))
    || (message.role === 'user' && _isToolResultBlock(block) && isUserFacingTool(toolUsesById[block.tool_use_id])));
}

// Intentions: what the user told us when creating the project (the new-project form, kept on the project as
// bootstrap_data), shown as their first message. The agent was handed it behind the scenes and opens the chat
// replying to it ("Thanks for the description..."), but it's not a chat message of its own, so without this
// the conversation starts with an answer to nothing. Laid out like the answers card: each form question
// with what they put. Kinds we offered are shown in the user's language; ones they typed, as typed.
// Intentions: who's talking, beside their messages: the agent's avatar on the left, the user's on the right.
// Only the first message of a run from the same side shows it (`isShown`), at its top, so it doesn't move
// when a time is revealed under a bubble; the others keep its room, so the bubbles of a run line up.
function ChatAvatar({ role, isShown }: { role: AiMessage['role']; isShown: boolean }) {
  const user = useStore(state => state.user);
  return (
    <MessageAvatar aria-hidden={!isShown} className={cn('self-start bg-transparent', !isShown && 'invisible')}>
      {role === 'user' ? <UserAvatar user={user} className='size-8' /> : <AgentAvatar />}
    </MessageAvatar>
  );
}

function StartingBriefMessage({ bootstrapData, hasAvatar = true }: { bootstrapData: Record<string, unknown>; hasAvatar?: boolean }) {
  const { t } = useTranslation();
  const description = _.trim(_.toString(_.get(bootstrapData, 'description', '')));
  const siteKindLabels = _.map(_.castArray(_.get(bootstrapData, 'site_kinds', [])), kind => {
    const option = SITE_KIND_OPTIONS.find(item => item.value === kind);
    return option ? t(option.labelKey) : _.toString(kind);
  });
  const fields = _.filter([
    { key: 'description', question: t('new_project_description_label'), answer: description },
    { key: 'kinds', question: t('new_project_kind_label'), answer: _.join(_.compact(siteKindLabels), ', ') },
  ], 'answer');

  if (_.isEmpty(fields)) {
    return null;
  }
  return (
    <Message align='end' data-component='starting-brief'>
      <ChatAvatar role='user' isShown={hasAvatar} />
      <MessageContent>
        <Bubble variant='secondary' align='end'>
          <BubbleContent className={cn(_USER_BUBBLE_CONTENT_CLASS, 'flex flex-col gap-2.5 py-3')}>
            {_.map(fields, ({ key, question, answer }) => (
              <div key={key} className='flex flex-col gap-0.5'>
                <span className='text-xs text-muted-foreground'>{question}</span>
                <span className='whitespace-pre-wrap'>{answer}</span>
              </div>
            ))}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

// Intentions: renders one message. User messages sit on the right in bubbles (text, or their answers);
// the agent's replies sit on the left in a frame (questions last), with its work in progress as marker
// lines. Bubbles show their time when tapped (TimedBubble).
// No avatars: alignment alone already says who's talking.
// `hasAvatar`: whether this message starts a run from its side, and so shows the avatar (see ChatAvatar).
export default function ChatMessageItem({ message, renderContext, hasAvatar = true }: {
  message: AiMessage;
  renderContext: ChatRenderContext;
  hasAvatar?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <Message align={isUser ? 'end' : 'start'} data-messageseq={message.seq} className='gap-2.5'>
      <ChatAvatar role={message.role} isShown={hasAvatar} />
      <MessageContent>
        {isUser
          ? <UserMessageBlocks message={message} renderContext={renderContext} />
          : <AssistantMessageBlocks message={message} renderContext={renderContext} />}
      </MessageContent>
    </Message>
  );
}

export { hasVisibleContent, StartingBriefMessage };
