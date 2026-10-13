import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslation } from 'react-i18next';
import { XIcon } from 'lucide-react';

import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from 'src/components/shadui/dialog';

// Intentions: one image, full screen over a see-through backdrop — the single-image cousin of
// ImageGallery's lightbox, without the carousel. Closes on Esc (the dialog's default), the X, or a click
// on the backdrop around the image.
// Built from the dialog's parts rather than DialogContent: DialogContent always adds its own 80%-black
// overlay, which stacked under any backdrop of ours and came out near-opaque. Here there's exactly one
// backdrop (the overlay, lightened) and the popup itself is transparent.
export default function ImageLightbox({ src, alt, open, onClose }: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay className='bg-scrim-strong/75' />
        <DialogPrimitive.Popup
          // Only clicks on the backdrop area itself close it — not clicks on the image.
          onClick={e => e.target === e.currentTarget && onClose()}
          className='fixed inset-0 z-50 flex items-center justify-center p-4 outline-none duration-100 sm:p-12 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'
        >
          <DialogTitle className='sr-only'>{alt}</DialogTitle>
          <DialogDescription className='sr-only'>{alt}</DialogDescription>
          <button
            type='button'
            aria-label={t('image_lightbox_close')}
            onClick={onClose}
            className='absolute top-5 right-5 z-10 inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-scrim-foreground hover:bg-scrim-foreground/10'
          >
            <XIcon className='size-6' />
          </button>
          <img src={src} alt={alt} className='max-h-full max-w-[min(100%,800px)] rounded-md object-contain shadow-2xl' />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
