import { useMemo } from 'react';
import _ from 'lodash';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { Spinner } from 'src/components/common/Spinner';
import ChatMessageItem, { hasVisibleContent, type ChatRenderContext } from 'src/components/pages/projects/chat/ChatMessageItem';
import { Button } from 'src/components/shadui/button';
import { ADMIN_QUERY_KEY, getConversationFileUrl, getConversationMessages } from 'src/services/admin';
import { findPendingInteractions, indexToolResults, indexToolUses } from 'src/services/chatLog';
import { PATHS } from 'src/utils/constants';

// Intentions: a project's chat as its owner sees it, read-only (/admin/projects/<id>/conversations/<id>) -- the
// messages so far, drawn by the chat's own ChatMessageItem, with no composer and no live stream (Refresh re-reads).
// Questions the agent asked show as they stand: answered, or marked waiting (but nothing here can answer them).
// Gotcha: the user's avatar is the viewing admin's (ChatMessageItem takes it from the logged-in user).

export default function AdminConversation() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const conversationId = Number(params.conversationId);
  const { data: messages, isFetching, isError, refetch } = useQuery({
    queryKey: [ADMIN_QUERY_KEY, 'conversation', conversationId],
    queryFn: () => getConversationMessages(conversationId),
    staleTime: 0,
  });

  const renderContext = useMemo((): ChatRenderContext => ({
    toolUsesById: indexToolUses(messages || []),
    toolResultsByCallId: indexToolResults(messages || []),
    pendingInteractionIds: _.map(findPendingInteractions(messages || []), 'id'),
    isAgentWorking: false,
    getFileUrl: (path: string) => getConversationFileUrl(conversationId, path),
  }), [messages, conversationId]);
  const visibleMessages = _.filter(messages, message => hasVisibleContent(message, renderContext.toolUsesById));

  return (
    <div className='flex flex-col gap-6' data-page='admin-conversation' data-conversationid={conversationId}>
      <Link to={`${PATHS.admin}/projects/${projectId}`} className='text-sm text-muted-foreground hover:underline'>← Project #{projectId}</Link>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>
          Conversation <span className='font-mono text-base text-muted-foreground'>#{conversationId}</span>
          {messages && <span className='ml-2 text-base font-normal text-muted-foreground'>({_.size(messages)} messages)</span>}
        </h1>
        <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching} data-action='refresh'>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {isError && <p className='text-sm text-destructive'>Couldn’t read this conversation (does it exist?).</p>}
      {!messages && !isError && <Spinner className='size-5 self-center text-muted-foreground' />}
      {messages && _.isEmpty(visibleMessages) && <p className='text-sm text-muted-foreground'>Nothing said yet.</p>}

      <div className='mx-auto flex w-full max-w-4xl flex-col gap-5'>
        {/* As in the chat (AgentChat): the avatar on the first message of each run from one side, the time on its last. */}
        {_.map(visibleMessages, (message, index) => {
          const isRunStart = visibleMessages[index - 1]?.role !== message.role;
          return (
            <div key={message.seq} className={isRunStart ? '' : '-mt-3'} data-seq={message.seq}>
              <ChatMessageItem
                message={message}
                renderContext={renderContext}
                hasAvatar={isRunStart}
                isRunEnd={visibleMessages[index + 1]?.role !== message.role}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
