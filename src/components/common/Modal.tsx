import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from 'src/components/shadui/dialog';
import { Button } from 'src/components/shadui/button';
import { Separator } from 'src/components/shadui/separator';
import { cn } from 'cn';
import { useIsMobile } from 'src/utils/hooks';
import { XIcon } from 'lucide-react';

const SIZES = {
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
} as const;

const JUSTIFY_BUTTONS = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
} as const;

type ModalProps = {
  children?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  header?: React.ReactNode;
  buttons?: React.ReactNode[];
  size?: keyof typeof SIZES;
  justifyButtons?: keyof typeof JUSTIFY_BUTTONS;
  centered?: boolean;
  showHeaderDivider?: boolean;
  fullScreenMobile?: boolean;
  className?: string;
  // Clicking the backdrop closes the modal.
  maskClosable?: boolean;
  // `esc` closes the modal.
  keyboard?: boolean;
};

export default function Modal({
  children,
  open,
  onClose = (() => {}),
  title,
  header,
  buttons = [],
  size = 'sm',
  justifyButtons = 'right',
  centered,
  showHeaderDivider = false,
  fullScreenMobile = true,
  className = '',
  maskClosable = false,
  keyboard = true,
}: ModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const fullScreen = isMobile && fullScreenMobile;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, { reason }) => {
        // Base UI has no prop to disable escape-dismissal, so filter on the reason.
        if (nextOpen || (reason === 'escape-key' && !keyboard)) {
          return;
        }
        onClose();
      }}
      disablePointerDismissal={!maskClosable}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          'gap-0 p-0',
          // rounded-none!: full screen has no corners, over the dialog's rounded-surface.
          fullScreen ? 'h-full max-h-full w-full max-w-full rounded-none!' : SIZES[size],
          className,
        )}
      >
        {header === undefined
          ? (
            <>
              <div className='flex flex-row items-center justify-between gap-4 px-7 pt-6 pr-5 pb-4'>
                {/* Some titles carry a name (`Delete "My bakery"?`): a long one wraps instead of pushing the close button. */}
                <DialogTitle className='min-w-0 text-2xl leading-tight font-bold tracking-[-0.02em]'>{title || ''}</DialogTitle>
                <DialogDescription className='sr-only'>{title || t('modal_dialog')}</DialogDescription>
                <Button variant='ghost' size='icon-sm' className='shrink-0' aria-label={t('modal_close')} onClick={onClose}>
                  <XIcon className='size-5' />
                </Button>
              </div>
              {showHeaderDivider && <Separator />}
            </>
          )
          : header}
        <div className='flex h-full flex-col justify-between'>
          {/* Spacing: under our own title the header's bottom padding already makes most of the gap, so the body adds
              little, leaving the title as far from the content as from the top edge (the header's pt-6). A custom
              `header` brings its own spacing, so it gets the full padding. At the bottom, 20px: about the gap between
              blocks inside a modal, so a last line sits midway between the content above it and the edge. */}
          <div className={cn('px-7 pb-5', header === undefined ? 'pt-2' : 'pt-7', centered && 'flex justify-center')}>
            {children}
          </div>
          {!_.isEmpty(buttons) && (
            <div className={cn('flex gap-3 px-7 pb-5', JUSTIFY_BUTTONS[justifyButtons])}>
              {buttons}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
