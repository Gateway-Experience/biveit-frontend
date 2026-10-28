import { Trans } from 'react-i18next';

import { SUPPORT_EMAIL } from 'src/utils/constants';

// Intentions: the way to a real person, for when the product can't sort it out by itself (the Help chat, the
// chat's "can't reach the assistant" states). `i18nKey` is a text with the email wrapped in <email></email>,
// which becomes a mailto link.
export default function HumanContact({ i18nKey, className }: { i18nKey: string; className?: string }) {
  return (
    <p data-component='human-contact' className={className}>
      <Trans
        i18nKey={i18nKey}
        values={{ email: SUPPORT_EMAIL }}
        components={{ email: <a href={`mailto:${SUPPORT_EMAIL}`} className='font-medium text-foreground underline underline-offset-2 hover:text-primary' /> }}
      />
    </p>
  );
}
