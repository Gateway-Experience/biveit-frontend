import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ChevronRightIcon, FileTextIcon, MessageCircleQuestionIcon, XIcon } from 'lucide-react';
import { cn } from 'cn';

import ChatAttachment from 'src/components/pages/projects/chat/ChatAttachment';
import {
  Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger,
} from 'src/components/shadui/attachment';
import { Bubble, BubbleContent } from 'src/components/shadui/bubble';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'src/components/shadui/collapsible';
import { Marker, MarkerContent, MarkerIcon } from 'src/components/shadui/marker';
import { Message, MessageContent } from 'src/components/shadui/message';
import { Spinner } from 'src/components/shadui/spinner';
import { getInteractionResults, isAskUser, isShowArtifact } from 'src/services/chatLog';
import type {
  AiMessage, AskUserQuestion, AttachmentBlock, ContentBlock, TextBlock, ToolResultBlock, ToolUseBlock,
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

// The registry's bubbles are sized for dense UIs (text-xs); chat reads better at body size.
const _USER_BUBBLE_CONTENT_CLASS = 'rounded-2xl px-4 py-2.5 text-sm';
const _AGENT_TEXT_CLASS = 'text-sm leading-relaxed whitespace-pre-wrap';

const _isTextBlock = (block: ContentBlock): block is TextBlock => block.type === 'text';
const _isAttachmentBlock = (block: ContentBlock): block is AttachmentBlock => block.type === 'attachment';
const _isToolUseBlock = (block: ContentBlock): block is ToolUseBlock => block.type === 'tool_use';
const _isToolResultBlock = (block: ContentBlock): block is ToolResultBlock => block.type === 'tool_result';

function _summarizeToolInput(input: Record<string, unknown>) {
  // Most tools have one obvious string arg (a path, a query...), which is all the collapsed row needs.
  return _.truncate(_.find(_.values(input), _.isString) as string | undefined, { length: 60 });
}

// The agent's `ask_user` call, as it sits in the log. The questions themselves are asked in the panel
// that replaces the composer, and the answers show up as the user's reply — so this stays a one-liner.
function AskUserMarker({ toolUse, isPending }: { toolUse: ToolUseBlock; isPending: boolean }) {
  const { t } = useTranslation();
  const questionCount = _.size(toolUse.input.questions as AskUserQuestion[]);

  return (
    <Marker data-toolcallid={toolUse.id}>
      <MarkerIcon><MessageCircleQuestionIcon /></MarkerIcon>
      <MarkerContent>{t('chat_asked_questions', { count: questionCount })}</MarkerContent>
      {isPending && <span className='rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground'>{t('chat_waiting_for_answer')}</span>}
    </Marker>
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

// The user's answers, shown as their side of the conversation: each answered question with what they
// picked. One answer message can cover several `ask_user` calls (the agent's whole message is answered in
// one go), so it's one card for all of them, in the order asked. A dismiss shows where the user bailed
// out; questions they never reached are left out.
function InteractionAnswerBubble({ answers }: { answers: { toolResult: ToolResultBlock; toolUse?: ToolUseBlock }[] }) {
  const { t } = useTranslation();
  const answeredQuestions = _.flatMap(answers, ({ toolResult, toolUse }) => {
    const questions = (toolUse?.input.questions || []) as AskUserQuestion[];
    return _.map(getInteractionResults(toolResult), (result, index) => ({
      key: `${toolResult.tool_use_id}:${index}`,
      question: questions[index]?.question,
      result,
    }));
  });

  return (
    <Bubble variant='secondary' align='end' data-toolresultfor={_.map(answers, 'toolResult.tool_use_id').join(',')}>
      <BubbleContent className={cn(_USER_BUBBLE_CONTENT_CLASS, 'flex flex-col gap-2.5 py-3')}>
        {_.map(_.reject(answeredQuestions, { result: { status: 'untouched' } }), ({ key, question, result }) => (
          <div key={key} className='flex flex-col gap-0.5'>
            <span className='text-xs text-muted-foreground'>{question}</span>
            <span className={cn('font-medium', result.status === 'aborted' && 'font-normal text-muted-foreground italic')}>
              {result.status === 'submitted'
                ? _.join(_.compact([...result.value.selected, result.value.custom]), ', ') || t('chat_answer_none')
                : t('chat_answer_dismissed')}
            </span>
          </div>
        ))}
      </BubbleContent>
    </Bubble>
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

// Intentions: a regular (non-`ask_user`) tool call is noise most of the time, so it's a marker line
// (status + name + main argument) that expands to show the raw input and result for the curious.
// The BE only sends `ask_user` today; this is for when the real agent's own tool calls come through.
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

  // Answers to the agent's questions share one card; results of its other tools render under the call.
  const answers = _.filter(
    _.map(_.filter(message.content, _isToolResultBlock), toolResult => ({ toolResult, toolUse: renderContext.toolUsesById[toolResult.tool_use_id] })),
    ({ toolUse }) => isAskUser(toolUse),
  );
  const answerCard = !_.isEmpty(answers) && <InteractionAnswerBubble key='answers' answers={answers} />;

  return [attachmentRow, answerCard, ..._.map(_.filter(message.content, _isTextBlock), (block, index) => (
    <Bubble key={index} variant='secondary' align='end'>
      <BubbleContent className={cn(_USER_BUBBLE_CONTENT_CLASS, 'whitespace-pre-wrap')}>{block.text}</BubbleContent>
    </Bubble>
  ))];
}

function AssistantMessageBlocks({ message, renderContext }: { message: AiMessage; renderContext: ChatRenderContext }) {
  return _.map(message.content, (block, index) => {
    if (_isTextBlock(block)) {
      return (
        <Bubble key={index} variant='ghost'>
          <BubbleContent className={_AGENT_TEXT_CLASS}>{block.text}</BubbleContent>
        </Bubble>
      );
    }
    if (_isToolUseBlock(block) && isShowArtifact(block)) {
      return <ShowArtifactCard key={block.id} toolUse={block} onOpenArtifact={renderContext.onOpenArtifact} />;
    }
    if (_isToolUseBlock(block) && isAskUser(block)) {
      return <AskUserMarker key={block.id} toolUse={block} isPending={_.includes(renderContext.pendingInteractionIds, block.id)} />;
    }
    if (_isToolUseBlock(block)) {
      return (
        <ToolCallMarker
          key={block.id}
          toolUse={block}
          toolResult={renderContext.toolResultsByCallId[block.id]}
          isAgentWorking={renderContext.isAgentWorking}
        />
      );
    }
    // Unknown block types are skipped (the BE's set keeps growing).
    return null;
  });
}

// [Pure] Whether a message has anything to draw. Users' messages carrying only results of regular tool
// calls don't (those show under the call), and neither do messages made of unknown blocks.
function hasVisibleContent(message: AiMessage, toolUsesById: Record<string, ToolUseBlock>) {
  return _.some(message.content, block => _isTextBlock(block)
    || (message.role === 'user' && _isAttachmentBlock(block))
    || (message.role === 'assistant' && _isToolUseBlock(block))
    || (message.role === 'user' && _isToolResultBlock(block) && isAskUser(toolUsesById[block.tool_use_id])));
}

// Intentions: renders one message. User messages sit on the right in bubbles (text, or their answers);
// the agent's are open text with its tool calls inline as marker lines, in the order it produced them.
// No avatars: alignment alone already says who's talking.
export default function ChatMessageItem({ message, renderContext }: { message: AiMessage; renderContext: ChatRenderContext }) {
  const isUser = message.role === 'user';

  return (
    <Message align={isUser ? 'end' : 'start'} data-messageseq={message.seq}>
      <MessageContent>
        {isUser
          ? <UserMessageBlocks message={message} renderContext={renderContext} />
          : <AssistantMessageBlocks message={message} renderContext={renderContext} />}
      </MessageContent>
    </Message>
  );
}

export { hasVisibleContent };
