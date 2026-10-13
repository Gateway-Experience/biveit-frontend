import { useCallback, useEffect, useMemo, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { useNotification } from 'src/components/common/NotificationProvider';
import {
  getChatErrorCode, getConversation, getConversationFileUrl, getMessages, postChatMessage, subscribeToMessages,
  uploadAttachments,
} from 'src/services/chat';
import { findPendingInteractions, hasOlderMessages, isAgentPresumedWorking, mergeMessages } from 'src/services/chatLog';
import type { AiMessage, Attachment, InteractionResult, PostChatMessageBody } from 'src/types/chat';

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
export default function useAgentChat(projectId: number) {
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

  const receiveMessages = useCallback((incomingMessages: AiMessage[]) => {
    setMessages(previousMessages => mergeMessages(previousMessages || [], incomingMessages));
  }, []);

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
      unsubscribe = subscribeToMessages(conversation.id, _.last(history)?.seq || 0, message => receiveMessages([message]));
    })().catch(() => !isCancelled && setHasLoadFailed(true));

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [projectId, receiveMessages]);

  // Prepends the page before the oldest message we have. Overlaps and repeats are fine: the merge dedupes.
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
      receiveMessages([await postChatMessage(conversationId as number, body)]);
      return true;
    } catch (error) {
      notifyError(error, 'chat_send_failed');
      return false;
    } finally {
      setIsPosting(false);
    }
  }, [conversationId, receiveMessages, notifyError]);

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
  const submitAnswers = useCallback(
    (interactionId: string, results: InteractionResult[]) => postMessage({ type: 'submission', interaction_id: interactionId, results }),
    [postMessage],
  );

  const pendingInteractions = useMemo(() => findPendingInteractions(messages || []), [messages]);
  const isAgentWorking = useMemo(() => isAgentPresumedWorking(messages || []), [messages]);

  return {
    conversationId, messages, hasLoadFailed, pendingInteractions, isAgentWorking, isPosting, sendText, submitAnswers,
    uploadFiles, getFileUrl, loadOlderMessages, isLoadingOlder, hasLoadOlderFailed,
    hasOlder: hasOlderMessages(messages || []),
  };
}
