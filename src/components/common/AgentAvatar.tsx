import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { BrandMark } from 'src/components/common/BrandLogo';

// Intentions: the agent's face in the chat: the biveit "V" on a soft lavender-to-lime disc, so it reads as
// the product itself talking rather than a made-up character. Same size as the user's avatar (size-8 by
// default), and the mark follows the theme like the logo does.
export default function AgentAvatar({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      role='img'
      aria-label={t('chat_agent_name')}
      data-component='agent-avatar'
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary/35 to-brand-light/45 ring-1 ring-foreground/10',
        className,
      )}
    >
      <BrandMark className='h-1/2 translate-y-px' />
    </span>
  );
}
