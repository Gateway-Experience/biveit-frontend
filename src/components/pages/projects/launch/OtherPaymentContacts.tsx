import _ from 'lodash';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react';

import { getSystemConfig, SYSTEM_CONFIG_QUERY_KEY } from 'src/services/systemConfig';
import { SUPPORT_EMAIL } from 'src/utils/constants';
import { useMediaQuery } from 'src/utils/hooks';

// Intentions: the way out for someone who can't pay by card -- a "Can't pay by card?" link under the pay button that
// opens how to reach us (PayPal / bank transfer get sorted out in that conversation, then an admin sets the plan by
// hand). The contacts come from system config PAYMENT_CONTACTS, so they change without a deploy.
// On a touchscreen a contact opens its app (wa.me / zalo.me / mailto); on a computer it's just text to copy, since
// those links pop open desktop apps or mail clients people don't want. Touch, not width: a narrow desktop window has
// no WhatsApp app to open.

type PaymentContacts = { whatsapp?: string | null; zalo?: string | null; email?: string | null };

const _CONTACT_KINDS = [
  { key: 'whatsapp', label: 'WhatsApp', toUrl: (value: string) => `https://wa.me/${value}` },
  { key: 'zalo', label: 'Zalo', toUrl: (value: string) => `https://zalo.me/${value}` },
  { key: 'email', label: 'Email', toUrl: (value: string) => `mailto:${value}` },
] as const;

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };
  return (
    <button type='button' onClick={copy} className='shrink-0 text-muted-foreground hover:text-foreground' aria-label={t('launch_other_payment_copy')}>
      {isCopied ? <CheckIcon className='size-3.5' /> : <CopyIcon className='size-3.5' />}
    </button>
  );
}

export default function OtherPaymentContacts({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const isTouch = useMediaQuery('(pointer: coarse)');
  const { data: systemConfig } = useQuery({ queryKey: [SYSTEM_CONFIG_QUERY_KEY], queryFn: getSystemConfig, enabled: isOpen });
  const contacts = (systemConfig?.PAYMENT_CONTACTS as PaymentContacts | undefined) || { email: SUPPORT_EMAIL };
  const shownContacts = _.filter(_CONTACT_KINDS, kind => !!contacts[kind.key]);
  const projectLine = t('launch_other_payment_project', { name: projectName, id: projectId, interpolation: { escapeValue: false } });

  if (!isOpen) {
    return (
      <button type='button' onClick={() => setIsOpen(true)} className='self-end text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground' data-action='other-payment'>
        {t('launch_other_payment_link')}
      </button>
    );
  }
  return (
    <div className='flex flex-col gap-2 rounded-xl border p-3 text-xs' data-component='other-payment-contacts'>
      <p>{t('launch_other_payment_body')}</p>
      {_.map(shownContacts, kind => {
        const value = contacts[kind.key] as string;
        return (
          <div key={kind.key} className='flex items-center gap-2' data-contact={kind.key}>
            <span className='w-16 shrink-0 text-muted-foreground'>{kind.label}</span>
            {isTouch
              ? <a href={kind.toUrl(value)} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 font-medium underline underline-offset-2'>{value}<ExternalLinkIcon className='size-3' /></a>
              : <span className='font-medium select-all'>{value}</span>}
            <CopyButton text={value} />
          </div>
        );
      })}
      <div className='flex items-center gap-2 text-muted-foreground'>
        <span>{t('launch_other_payment_mention')} <span className='font-medium text-foreground'>{projectLine}</span></span>
        <CopyButton text={projectLine} />
      </div>
    </div>
  );
}
