import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslation } from 'react-i18next';
import { XIcon } from 'lucide-react';

import DeployPanel from 'src/components/pages/projects/deploy/DeployPanel';
import { Button } from 'src/components/shadui/button';
import { Dialog, DialogOverlay, DialogPortal } from 'src/components/shadui/dialog';

// The card rises and grows into place, a touch slower than a plain dialog so the moment registers.
const _POPUP_CLASS = 'fixed top-1/2 left-1/2 z-50 max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 outline-none duration-500 ease-out data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-open:slide-in-from-bottom-8 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:duration-200';

// Intentions: the "just now" moment — the user signed off their site while this tab was open, so the offer
// to publish pops up right then. Same offer as the Deploy tab (which stays there once this is closed),
// dressed up for the occasion.
// Built from the dialog's parts rather than the shared Modal: that one always comes with an 80%-black
// backdrop that snaps in, too heavy for a happy moment. Here it's the lighter scrim, blurred, eased in.
export default function SiteReadyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay className='bg-scrim duration-300 supports-backdrop-filter:backdrop-blur-sm' />
        <DialogPrimitive.Popup data-component='site-ready-modal' className={_POPUP_CLASS}>
          <DeployPanel variant='celebration' />
          {/* Last in the tab order, so focus opens inside the offer rather than on "close". */}
          <Button variant='ghost' size='icon-sm' aria-label={t('deploy_close')} onClick={onClose} className='absolute top-4 right-4'>
            <XIcon />
          </Button>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
