import { useLayoutEffect, useRef, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { v4 } from 'uuid';
import { ArrowUpIcon, PaperclipIcon } from 'lucide-react';
import { cn } from 'cn';

import { useNotification } from 'src/components/common/NotificationProvider';
import ChatAttachment from 'src/components/pages/projects/chat/ChatAttachment';
import { CHAT_TEXT_SIZE_CLASS } from 'src/components/pages/projects/chat/chatStyles';
import { AttachmentGroup } from 'src/components/shadui/attachment';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from 'src/components/shadui/input-group';
import { formatFileSize } from 'src/utils/common';
import type { Attachment } from 'src/types/chat';

// Attachment limits — our own product rules, stricter than the BE's (10 files per upload, 25 MB each).
// The count is per message, uploading ones included.
const _MAX_ATTACHMENTS_PER_MESSAGE = 5;
const _MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// A file picked in the composer. `clientId` is a transient key for this list only (never sent);
// `stored` is filled in once the upload comes back, and until then the chip shows as uploading.
type DraftAttachment = { clientId: string; name: string; mime: string; size: number; stored?: Attachment };

// Intentions: the prompt box. Enter sends, Shift+Enter makes a new line, and it grows with the text
// up to a cap. Files (picked with the paperclip, or pasted — handy for screenshots) upload straight
// away and sit above the text as removable chips; sending waits until they've all landed.
// Typing is always allowed; only sending is held back (see `isSendDisabled` in AgentChat).
export default function ChatComposer({ onSend, onUpload, getFileUrl, isSendDisabled, isAttachDisabled = false }: {
  // Resolves to false when the send failed, in which case the text and chips are put back.
  onSend: (text: string, attachmentPaths: string[]) => Promise<boolean>;
  // Resolves to the stored files in the order given, or null when the upload failed.
  onUpload: (files: File[]) => Promise<Attachment[] | null>;
  getFileUrl: (path: string) => string;
  isSendDisabled: boolean;
  isAttachDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([]);

  // One row to start, growing with the text up to max-h-48 (then it scrolls). Done by hand rather than
  // relying on `field-sizing: content` alone, since Firefox doesn't support that and would stay one row.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [draft]);

  const trimmedDraft = _.trim(draft);
  const isUploading = _.some(draftAttachments, draftAttachment => !draftAttachment.stored);
  const canSend = !isSendDisabled && !isUploading && (!_.isEmpty(trimmedDraft) || !_.isEmpty(draftAttachments));

  const isAtAttachmentLimit = _.size(draftAttachments) >= _MAX_ATTACHMENTS_PER_MESSAGE;

  async function attachFiles(pickedFiles: File[]) {
    if (isAttachDisabled) {
      return;
    }
    // Files that break a limit are left out (oversized ones first, then whatever doesn't fit the count),
    // and the user is told why.
    const [smallEnoughFiles, oversizedFiles] = _.partition(pickedFiles, file => file.size <= _MAX_ATTACHMENT_BYTES);
    if (!_.isEmpty(oversizedFiles)) {
      notify('warning', t('chat_attachment_too_large', {
        names: _.join(_.map(oversizedFiles, 'name'), ', '),
        limit: formatFileSize(_MAX_ATTACHMENT_BYTES),
      }));
    }
    const files = _.take(smallEnoughFiles, Math.max(_MAX_ATTACHMENTS_PER_MESSAGE - _.size(draftAttachments), 0));
    if (_.size(files) < _.size(smallEnoughFiles)) {
      notify('warning', t('chat_attachment_limit', { count: _MAX_ATTACHMENTS_PER_MESSAGE }));
    }
    if (_.isEmpty(files)) {
      return;
    }
    const pendingAttachments = _.map(files, file => ({ clientId: v4(), name: file.name, mime: file.type, size: file.size }));
    const pendingClientIds = _.map(pendingAttachments, 'clientId');
    setDraftAttachments(previous => [...previous, ...pendingAttachments]);

    const storedAttachments = await onUpload(files);
    // Matched back by position — the BE returns them in the order sent. Failed uploads just drop out
    // (the hook has already said why).
    const storedByClientId = _.zipObject(pendingClientIds, storedAttachments || []);
    setDraftAttachments(previous => _.compact(_.map(previous, draftAttachment => {
      if (!_.includes(pendingClientIds, draftAttachment.clientId)) {
        return draftAttachment;
      }
      const stored = storedByClientId[draftAttachment.clientId];
      return stored ? { ...draftAttachment, stored } : null;
    })));
  }

  async function submit() {
    if (!canSend) {
      return;
    }
    const sentAttachments = draftAttachments;
    setDraft('');
    setDraftAttachments([]);
    const isSent = await onSend(trimmedDraft, _.map(sentAttachments, 'stored.path'));
    // Put things back without clobbering whatever was typed or attached while the send was in flight.
    if (!isSent) {
      setDraft(current => (_.isEmpty(_.trim(current)) ? trimmedDraft : current));
      setDraftAttachments(current => [...sentAttachments, ...current]);
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submit(); }}>
      {/* The registry's input-group is sized for dense UIs; scaled up here to match the app's inputs. */}
      <InputGroup className='rounded-2xl bg-card shadow-xs'>
        {!_.isEmpty(draftAttachments) && (
          <InputGroupAddon align='block-start' className='px-3 pt-3'>
            {/* pt/pr: room for the remove badges that poke out of image thumbnails' corners (the group clips overflow).
                No edge fade: the registry's `scroll-fade-x` stays on permanently in browsers without scroll-driven
                animations (e.g. Firefox), fading the first thumbnail; with at most 5 files the row rarely scrolls. */}
            <AttachmentGroup className='w-full items-end pt-2.5 pr-2.5 [mask-image:none]'>
              {_.map(draftAttachments, draftAttachment => (
                <ChatAttachment
                  key={draftAttachment.clientId}
                  name={draftAttachment.name}
                  mime={draftAttachment.mime}
                  size={draftAttachment.size}
                  url={draftAttachment.stored && getFileUrl(draftAttachment.stored.path)}
                  isUploading={!draftAttachment.stored}
                  // Only drops it from this message; the stored file stays on the BE, which is harmless.
                  onRemove={() => setDraftAttachments(previous => _.reject(previous, { clientId: draftAttachment.clientId }))}
                />
              ))}
            </AttachmentGroup>
          </InputGroupAddon>
        )}
        <InputGroupTextarea
          ref={textareaRef}
          data-slot='chat-composer'
          rows={1}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            // `isComposing` keeps Enter from sending mid-way through an IME (e.g. Vietnamese/Japanese input).
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={e => {
            const pastedFiles = Array.from(e.clipboardData.files);
            if (!_.isEmpty(pastedFiles)) {
              e.preventDefault();
              attachFiles(pastedFiles);
            }
          }}
          placeholder={t('chat_placeholder')}
          aria-label={t('chat_placeholder')}
          // flex-none: the input-group stacks vertically here, and its default flex-1 would size the textarea
          // from its row count, ignoring the height set by the auto-grow above.
          // leading-6: a whole-pixel line height. The inherited 1.5 × 15px = 22.5px left the box at 40.5px, which the
          // auto-grow rounded to 41px via scrollHeight — so every keystroke flicked it 41 → 40.5 → 41 and nudged the
          // transcript's scroll position (it was pinned to the bottom) by a pixel. Must come after the text size
          // class, which `cn` treats as overriding any earlier leading.
          className={cn('max-h-48 min-h-0 flex-none px-4 pt-2.5 pb-2', CHAT_TEXT_SIZE_CLASS, 'leading-6')}
        />
        {/* pt-0: the gap above the buttons lives in the textarea's pb-2 instead, so that strip is clickable text area. */}
        <InputGroupAddon align='block-end' className='justify-between pt-0'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            hidden
            onChange={e => {
              attachFiles(Array.from(e.target.files || []));
              // Cleared so picking the same file again still fires onChange.
              e.target.value = '';
            }}
          />
          <InputGroupButton
            size='icon-sm'
            aria-label={t('chat_attach_files')}
            title={t('chat_attach_files')}
            disabled={isAttachDisabled || isAtAttachmentLimit}
            onClick={() => fileInputRef.current?.click()}
            className='size-8 rounded-full'
          >
            <PaperclipIcon />
          </InputGroupButton>
          <InputGroupButton type='submit' variant='default' size='icon-sm' disabled={!canSend} aria-label={t('chat_send')} className='size-8 rounded-full'>
            <ArrowUpIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
