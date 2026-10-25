import { useCallback, useEffect, useMemo, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { useNotification } from 'src/components/common/NotificationProvider';
import {
  getChatErrorCode, getConversation, getConversationFileUrl, getMessages, postChatMessage, resendLastMessage,
  subscribeToConversationEvents, uploadAttachments,
} from 'src/services/chat';
import {
  findLastSpokenMessage, findPendingInteractions, getChatIntroState, getIntroductionOverdueAtMs, getTurnSilenceEndsAtMs,
  hasOlderMessages, isAgentWorking as getIsAgentWorking, isSignalMessage, mergeMessages,
} from 'src/services/chatLog';
import type { AgentSessionStatus, AiMessage, Attachment, InteractionAnswer, PostChatMessageBody } from 'src/types/chat';

// Error codes the user can do something about get their own wording (`chat_error_<CODE>`, with the BE's
// `reason` when it gives one); anything else gets the generic message for that action.
const _KNOWN_ERROR_CODES = [
  'INTERACTION_PENDING', 'INTERACTION_NOT_PENDING', 'INVALID_SUBMISSION', 'INVALID_ATTACHMENT', 'UPLOAD_REJECTED',
];

// Intentions: one project's conversation with its agent. The message log is the only state; whether a
// question is open or the agent seems busy is derived from it.
// Flow: find the conversation -> load its newest page -> stream everything after the last seq we have.
// Older pages are fetched on demand (`loadOlderMessages`, when the user scrolls to the top).
// Nothing is reset when `projectId` changes, so mount the consumer with `key={projectId}`.
// `sessionStatus` is how opening the project went (useProjectSession) — it explains an empty log.
// `onDevenvChange` must be stable (e.g. a dispatch): changing it reconnects the stream.
export default function useAgentChat(projectId: number, options: {
  sessionStatus?: AgentSessionStatus;
  onDevenvChange?: () => void;
} = {}) {
  const { sessionStatus = 'ready', onDevenvChange } = options;
  const { t } = useTranslation();
  const notify = useNotification();
  const [conversationId, setConversationId] = useState<number | null>(null);
  // null = not loaded yet.
  const [messages, setMessages] = useState<AiMessage[] | null>(null);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  // A POST (text or answers) is in flight — nothing else gets sent until it settles.
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  // Set when an older page fails, so the auto-load doesn't hammer a failing endpoint; the UI offers a retry.
  const [hasLoadOlderFailed, setHasLoadOlderFailed] = useState(false);
  // Seqs of the messages this tab posted successfully. Only used for conversations still on an older runner
  // (see isAgentWorking's fallback), so a reply that never came for an older or failed message can't lock the chat.
  const [sentSeqs, setSentSeqs] = useState<number[]>([]);
  // The newest seq we had when this tab's resend of an undelivered message went through, or null: the agent
  // counts as working on it until its next AGENT_IDLE (see isAgentWorking).
  const [handedOverAfterSeq, setHandedOverAfterSeq] = useState<number | null>(null);
  // A message was stored but didn't reach the agent (AGENT_UNAVAILABLE): the newest seq we had when that
  // happened, or null. It stops counting once the agent says anything after it (see `hasUndeliveredMessage`),
  // which doesn't depend on the stored message itself arriving on the stream.
  const [undeliveredAfterSeq, setUndeliveredAfterSeq] = useState<number | null>(null);
  const [isResending, setIsResending] = useState(false);

  const receiveMessages = useCallback((incomingMessages: AiMessage[]) => {
    setMessages(previousMessages => mergeMessages(previousMessages || [], incomingMessages));
  }, []);

  // When the agent was handed the project, re-read after every (re)open: a retry may have introduced it
  // again. It's what tells "its first message is on the way" from "its first turn died" (getChatIntroState).
  const [introducedAt, setIntroducedAt] = useState<string | null>(null);
  useEffect(() => {
    if (sessionStatus !== 'ready') {
      return;
    }
    let isCancelled = false;
    getConversation(projectId)
      .then(conversation => !isCancelled && setIntroducedAt(conversation.meta?.introduced_at ?? null))
      .catch(_.noop);  // a failed read only means no overdue check this time
    return () => {
      isCancelled = true;
    };
  }, [projectId, sessionStatus]);

  // The clock the introduction is judged by: moved on when it turns overdue, nothing else having changed.
  const [introCheckedAtMs, setIntroCheckedAtMs] = useState(() => Date.now());
  useEffect(() => {
    if (!introducedAt) {
      return;
    }
    // A little past it, so the check lands on the far side.
    const timer = setTimeout(() => setIntroCheckedAtMs(Date.now()), Math.max(0, getIntroductionOverdueAtMs(introducedAt) - Date.now()) + 100);
    return () => clearTimeout(timer);
  }, [introducedAt]);

  useEffect(() => {
    // Both only exist to tear down an async setup that may still be in flight when the effect is cleaned up.
    let isCancelled = false;
    let unsubscribe = _.noop;

    (async () => {
      const conversation = await getConversation(projectId);
      const history = await getMessages(conversation.id);
      if (isCancelled) {
        return;
      }
      setConversationId(conversation.id);
      receiveMessages(history);
      // Starting after what we already have; the stream (and its reconnects) carry it on from there.
      unsubscribe = subscribeToConversationEvents(conversation.id, _.last(history)?.seq || 0, {
        onMessage: message => receiveMessages([message]),
        // The dev environment rides the same stream; the caller re-reads it on a nudge or a (re)connect.
        onConnect: onDevenvChange,
        onDevenvChange,
      });
    })().catch(() => !isCancelled && setHasLoadFailed(true));

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [projectId, receiveMessages, onDevenvChange]);

  // Prepends the page before the oldest message we have. Overlaps and repeats are fine: the merge dedupes.
  // The Documents list refetches when it moves (the agent can revise a file without showing it again).
  const latestAssistantSeq = findLastSpokenMessage(messages || [], { role: 'assistant' })?.seq;

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || isLoadingOlder || !hasOlderMessages(messages || [])) {
      return;
    }
    setIsLoadingOlder(true);
    setHasLoadOlderFailed(false);
    try {
      receiveMessages(await getMessages(conversationId, { beforeSeq: _.first(messages)?.seq }));
    } catch {
      setHasLoadOlderFailed(true);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [conversationId, isLoadingOlder, messages, receiveMessages]);

  const notifyError = useCallback((error: unknown, fallbackMessageKey: string) => {
    const errorCode = getChatErrorCode(error);
    notify('error', _.includes(_KNOWN_ERROR_CODES, errorCode)
      ? t(`chat_error_${errorCode}`, { reason: _.get(error, 'data.detail.reason') })
      : t(fallbackMessageKey));
  }, [notify, t]);

  // Resolves to whether it went through, so the caller can hand the user their input back on failure.
  const postMessage = useCallback(async (body: PostChatMessageBody) => {
    setIsPosting(true);
    try {
      // Our own message also comes back on the stream; the merge dedupes it by seq.
      const storedMessage = await postChatMessage(conversationId as number, body);
      receiveMessages([storedMessage]);
      setSentSeqs(previous => [...previous, storedMessage.seq]);
      return true;
    } catch (error) {
      // Stored, just not delivered: the message is in the log (it comes in on the stream), so the input
      // is done with. The chat then offers to hand it over again rather than have the user retype it.
      if (getChatErrorCode(error) === 'AGENT_UNAVAILABLE') {
        setUndeliveredAfterSeq(_.last(messages)?.seq ?? 0);
        return true;
      }
      notifyError(error, 'chat_send_failed');
      return false;
    } finally {
      setIsPosting(false);
    }
  }, [conversationId, receiveMessages, notifyError, messages]);

  // The "try again" for an undelivered message: the BE hands the stored one over again (no duplicate).
  const resendUndelivered = useCallback(async () => {
    setIsResending(true);
    try {
      const resentMessage = await resendLastMessage(conversationId as number);
      setUndeliveredAfterSeq(null);
      setHandedOverAfterSeq(_.last(messages)?.seq ?? 0);
      setSentSeqs(previous => [...previous, resentMessage.seq]);
    } catch (error) {
      // The agent replied in the meantime: nothing left to resend.
      if (getChatErrorCode(error) === 'NOTHING_TO_RESEND') {
        setUndeliveredAfterSeq(null);
      } else {
        notify('error', t('chat_resend_failed'));
      }
    } finally {
      setIsResending(false);
    }
  }, [conversationId, messages, notify, t]);

  // `attachmentPaths` come from `uploadFiles`; a message needs text, attachments, or both.
  const sendText = useCallback(
    (text: string, attachmentPaths: string[] = []) => postMessage({ type: 'text', text, attachments: attachmentPaths }),
    [postMessage],
  );

  // Resolves to the stored attachments (in the order given), or null if the upload failed.
  const uploadFiles = useCallback(async (files: File[]): Promise<Attachment[] | null> => {
    try {
      return await uploadAttachments(conversationId as number, files);
    } catch (error) {
      notifyError(error, 'chat_upload_failed');
      return null;
    }
  }, [conversationId, notifyError]);

  const getFileUrl = useCallback((path: string) => getConversationFileUrl(conversationId as number, path), [conversationId]);
  // One post answers everything pending — every pending question/action call (see buildSubmissionAnswers).
  const submitAnswers = useCallback(
    (answers: InteractionAnswer[]) => postMessage({ type: 'submission', answers }),
    [postMessage],
  );

  const pendingInteractions = useMemo(() => findPendingInteractions(messages || []), [messages]);
  const introState = getChatIntroState(messages, sessionStatus, introducedAt, introCheckedAtMs);
  // A signal after it isn't the agent replying (we can write those ourselves, e.g. on an approval).
  const hasUndeliveredMessage = !_.isNull(undeliveredAfterSeq)
    && !_.some(messages, message => message.role === 'assistant' && !isSignalMessage(message) && message.seq > undeliveredAfterSeq);
  // Opening the project failed with the conversation already under way: the empty-chat retry isn't showing,
  // so the chat needs its own.
  const isSessionDown = sessionStatus === 'failed' && introState === 'started';
  // Also "working" while its opening message is on the way: the session is up, it just hasn't spoken yet.
  // The clock a hung turn is judged by (see isAgentWorking): moved on when the log's been silent too long,
  // nothing else having changed.
  const [turnCheckedAtMs, setTurnCheckedAtMs] = useState(() => Date.now());
  const turnSilenceEndsAtMs = getTurnSilenceEndsAtMs(messages || []);
  useEffect(() => {
    if (_.isNull(turnSilenceEndsAtMs)) {
      return;
    }
    const timer = setTimeout(() => setTurnCheckedAtMs(Date.now()), Math.max(0, turnSilenceEndsAtMs - Date.now()) + 100);
    return () => clearTimeout(timer);
  }, [turnSilenceEndsAtMs]);
  const isAgentWorking = useMemo(
    () => introState === 'awaiting-agent'
      || getIsAgentWorking(messages || [], { sentSeqs, handedOverAfterSeq, nowMs: Math.max(turnCheckedAtMs, Date.now()) }),
    [introState, messages, sentSeqs, handedOverAfterSeq, turnCheckedAtMs],
  );

  return {
    conversationId, latestAssistantSeq, messages, introState, hasLoadFailed, pendingInteractions, isAgentWorking, isPosting, sendText, submitAnswers,
    hasUndeliveredMessage, resendUndelivered, isResending, isSessionDown,
    uploadFiles, getFileUrl, loadOlderMessages, isLoadingOlder, hasLoadOlderFailed,
    hasOlder: hasOlderMessages(messages || []),
  };
}
