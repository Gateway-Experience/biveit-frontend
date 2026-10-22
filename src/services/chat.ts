import _ from 'lodash';

import { callBe } from 'src/utils/request';
import type { AiConversation, AiMessage, Artifact, Attachment, PostChatMessageBody } from 'src/types/chat';

// Intentions: talking to the BE about a project's agent chat — conversation, messages (paged + the live
// stream), uploads, files and artifacts. Transport only; what the message log *means* lives in chatLog.ts.
// References: biveit-backend/docs/fe-handoff-agent-chat.md for the whole contract.

// Messages per page (opening the chat, and each scroll-up). The BE allows up to 200.
const _MESSAGES_PAGE_SIZE = 20;
// How long to wait before reopening a stream the browser gave up on (see subscribeToConversationEvents).
const _STREAM_RESTART_DELAY_MS = 5000;

// The project's current conversation (the BE creates it on first call).
async function getConversation(projectId: number): Promise<AiConversation> {
  return callBe(`/projects/${projectId}/conversation`);
}

// A page of messages, oldest first. No `beforeSeq` = the newest page (opening the chat); `beforeSeq` = the
// page just before that seq (scrolling up). Pages may run a little over `limit`: the BE never starts one
// on an answer, it reaches back to include the question. Anything newer comes from the stream instead.
async function getMessages(conversationId: number, options: { beforeSeq?: number; limit?: number } = {}): Promise<AiMessage[]> {
  return callBe({
    url: `/conversations/${conversationId}/messages`,
    params: _.omitBy({ before_seq: options.beforeSeq, limit: options.limit ?? _MESSAGES_PAGE_SIZE }, _.isNil),
  });
}

// Resolves to the user's own stored message. The agent's reply never comes back here — only on the stream.
async function postChatMessage(conversationId: number, body: PostChatMessageBody): Promise<AiMessage> {
  return callBe({ method: 'POST', url: `/conversations/${conversationId}/messages`, data: body });
}

// Stores files for attaching to a later message (posts nothing to the chat by itself). Returns them in
// the order given. The BE caps it (10 files per request, 25 MB each) and says why when it refuses.
async function uploadAttachments(conversationId: number, files: File[]): Promise<Attachment[]> {
  const formData = new FormData();
  _.forEach(files, file => formData.append('files', file));
  return callBe({ method: 'POST', url: `/conversations/${conversationId}/uploads`, data: formData });
}

// Where to load an uploaded (or agent-made) file from. Cookie-authenticated, so a plain <img src> or link works.
function getConversationFileUrl(conversationId: number, path: string) {
  return `${import.meta.env.VITE_API_BASE_URL}/conversations/${conversationId}/files?path=${encodeURIComponent(path)}`;
}

// Hands the user's latest message to the agent again, after posting it came back AGENT_UNAVAILABLE (it was
// stored, but never got through). Nothing new is stored. 409 NOTHING_TO_RESEND once the agent has replied.
async function resendLastMessage(conversationId: number): Promise<AiMessage> {
  return callBe({ method: 'POST', url: `/conversations/${conversationId}/resend` });
}

// Everything the agent has written for this conversation (the Documents tab), oldest first.
async function getArtifacts(conversationId: number): Promise<Artifact[]> {
  return callBe(`/conversations/${conversationId}/artifacts`);
}

// A conversation file's contents as text (for rendering markdown and the like). Kept raw: without the
// identity transform, axios would helpfully JSON.parse a .json file.
async function getConversationFileText(conversationId: number, path: string): Promise<string> {
  return callBe({
    url: `/conversations/${conversationId}/files`,
    params: { path },
    responseType: 'text',
    transformResponse: [(data: string) => data],
  });
}

// Streams every message after `afterSeq`, the user's own included, plus dev environment nudges. Returns
// the unsubscribe function.
// EventSource reconnects on its own after a dropped connection (the BE closes streams every 30 min) and
// resends the last event id (= seq), so the BE resumes right after it. But if a reconnect gets an HTTP
// error (a 502 mid-deploy, a 401...), it gives up for good — so then we open a fresh stream ourselves,
// after a pause, from the newest seq seen. Either way nothing is lost or repeated.
function subscribeToConversationEvents(conversationId: number, afterSeq: number, handlers: {
  onMessage: (message: AiMessage) => void;
  // Every time the stream (re)connects — anything that changed while it was down was missed.
  onConnect?: () => void;
  // The dev environment changed (a setup finished, servers started/stopped...). A bare nudge with no data
  // and no id: re-read GET /conversations/{id}/devenv.
  onDevenvChange?: () => void;
}) {
  // Mutable on purpose: the subscription's own lifecycle (current connection, retry timer, resume point).
  let eventSource: EventSource;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let newestSeq = afterSeq;
  let isUnsubscribed = false;

  const connect = () => {
    eventSource = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL}/conversations/${conversationId}/events?after_seq=${newestSeq}`,
      // The session cookie lives on the API origin — same reason as `withCredentials` in callBe.
      { withCredentials: true },
    );
    eventSource.addEventListener('message', (event: MessageEvent) => {
      const message: AiMessage = JSON.parse(event.data);
      newestSeq = Math.max(newestSeq, message.seq);
      handlers.onMessage(message);
    });
    eventSource.addEventListener('open', () => handlers.onConnect?.());
    eventSource.addEventListener('devenv', () => handlers.onDevenvChange?.());
    eventSource.addEventListener('error', () => {
      if (eventSource.readyState === EventSource.CLOSED && !isUnsubscribed) {
        restartTimer = setTimeout(connect, _STREAM_RESTART_DELAY_MS);
      }
    });
  };
  connect();

  return () => {
    isUnsubscribed = true;
    clearTimeout(restartTimer);
    eventSource.close();
  };
}

// The BE's error detail is either a bare code string or `{ code, reason }`.
function getChatErrorCode(error: unknown): string | undefined {
  const detail = _.get(error, 'data.detail');
  return _.isString(detail) ? detail : _.get(detail, 'code');
}

export {
  getArtifacts,
  resendLastMessage,
  getChatErrorCode,
  getConversation,
  getConversationFileText,
  getConversationFileUrl,
  getMessages,
  postChatMessage,
  subscribeToConversationEvents,
  uploadAttachments,
};
