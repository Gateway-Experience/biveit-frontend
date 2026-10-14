import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileIcon, XIcon } from 'lucide-react';

import ImageLightbox from 'src/components/common/ImageLightbox';
import {
  Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia,
  AttachmentTitle, AttachmentTrigger,
} from 'src/components/shadui/attachment';
import { Spinner } from 'src/components/common/Spinner';
import { formatFileSize } from 'src/utils/common';

// Images are bare thumbnails: no card border or padding around them, just the rounded picture.
const _IMAGE_ATTACHMENT_CLASS = 'w-16 border-0 bg-transparent has-data-[slot=attachment-media]:p-0';
// The remove button is a small badge centred on the attachment's top-right corner (mostly outside it, so it
// never covers the picture or the file name) — same for thumbnails and file chips. Whatever holds them needs
// a little top/right room for it. The vertical (thumbnail) variants are repeated because the registry's own
// vertical positioning would otherwise win over the plain classes.
const _REMOVE_ACTIONS_CLASS = 'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 group-data-[orientation=vertical]/attachment:top-0 group-data-[orientation=vertical]/attachment:right-0';
const _REMOVE_BUTTON_CLASS = 'size-5 rounded-full border bg-background shadow-xs hover:bg-muted';

// Intentions: one attached file, wherever it shows — a chip in the composer (still uploading, or ready
// with a remove button) or in a sent message (click to open). Images get a thumbnail once there's a URL
// to load it from (click to view it full size); everything else is an icon chip with its name and size
// (click to open it in a new tab).
export default function ChatAttachment({ name, mime, size, url, isUploading = false, onRemove }: {
  name: string;
  mime: string;
  size: number;
  // Where the stored file lives. Missing while it's still uploading.
  url?: string;
  isUploading?: boolean;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const isImage = mime.startsWith('image/') && Boolean(url);

  return (
    <Attachment
      data-attachmentname={name}
      state={isUploading ? 'uploading' : 'done'}
      orientation={isImage ? 'vertical' : 'horizontal'}
      className={isImage ? _IMAGE_ATTACHMENT_CLASS : 'max-w-64'}
    >
      <AttachmentMedia variant={isImage ? 'image' : 'icon'}>
        {isUploading && <Spinner />}
        {!isUploading && isImage && <img src={url} alt={name} />}
        {!isUploading && !isImage && <FileIcon />}
      </AttachmentMedia>
      {!isImage && (
        <AttachmentContent>
          <AttachmentTitle>{name}</AttachmentTitle>
          <AttachmentDescription>{isUploading ? t('chat_attachment_uploading') : formatFileSize(size)}</AttachmentDescription>
        </AttachmentContent>
      )}
      {isImage && <AttachmentTrigger aria-label={name} onClick={() => setIsLightboxOpen(true)} />}
      {/* Other files open in a new tab. The BE serves them sandboxed, so even an uploaded .html can't run script. */}
      {url && !isImage && <AttachmentTrigger render={<a href={url} target='_blank' rel='noreferrer' aria-label={name} />} />}
      {onRemove && (
        <AttachmentActions className={_REMOVE_ACTIONS_CLASS}>
          <AttachmentAction
            aria-label={t('chat_attachment_remove')}
            title={t('chat_attachment_remove')}
            onClick={onRemove}
            className={_REMOVE_BUTTON_CLASS}
          >
            <XIcon />
          </AttachmentAction>
        </AttachmentActions>
      )}
      {isImage && <ImageLightbox src={url as string} alt={name} open={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} />}
    </Attachment>
  );
}
