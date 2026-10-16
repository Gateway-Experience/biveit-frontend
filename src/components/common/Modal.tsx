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
          fullScreen ? 'h-full max-h-full w-full max-w-full rounded-none' : SIZES[size],
          className,
        )}
      >
        {header === undefined
          ? (
            <>
              <div className='flex flex-row items-center justify-between p-7 pr-5 pb-4'>
                <DialogTitle className='text-lg font-bold'>{title || ''}</DialogTitle>
                <DialogDescription className='sr-only'>{title || t('modal_dialog')}</DialogDescription>
                <Button variant='ghost' size='icon-sm' aria-label={t('modal_close')} onClick={onClose}>
                  <XIcon className='size-5' />
                </Button>
              </div>
              {showHeaderDivider && <Separator />}
            </>
          )
          : header}
        <div className='flex h-full flex-col justify-between'>
          <div className={cn('p-7', centered && 'flex justify-center')}>
            {children}
          </div>
          {!_.isEmpty(buttons) && (
            <div className={cn('flex gap-3 p-7 pt-0', JUSTIFY_BUTTONS[justifyButtons])}>
              {buttons}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
