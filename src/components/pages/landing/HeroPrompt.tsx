import { useState } from 'react';
import _ from 'lodash';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpIcon } from 'lucide-react';
import { cn } from 'cn';

import { Button } from 'src/components/shadui/button';
import { buildLoginPath } from 'src/utils/authRedirect';
import { EXAMPLE_IDEA_KEYS, NEW_PROJECT_IDEA_PARAM, PATHS } from 'src/utils/constants';
import { useTypewriter } from 'src/utils/hooks';

// Plenty for "what do you want built"; it also keeps the idea comfortably short as a URL param.
const _IDEA_MAX_LENGTH = 1000;

// Original purpose: the landing hero's way in (it replaced the "Start my website" / "See how it works" buttons).
// Intentions: a prompt box asking what site they'd like. Submitting takes them to log in, with the idea riding
// along in the URL (login's `?next=` → /projects/new?idea=...), so the new-project form opens with it filled in.
// While the box is empty and not focused, example ideas type themselves out as the placeholder.
export default function HeroPrompt({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const typedExample = useTypewriter(EXAMPLE_IDEA_KEYS.map(ideaKey => t(ideaKey)));
  const trimmedIdea = _.trim(idea);

  const submitIdea = () => {
    if (!trimmedIdea) {
      return;
    }
    const newProjectPath = `${PATHS.newProject}?${new URLSearchParams({ [NEW_PROJECT_IDEA_PARAM]: trimmedIdea })}`;
    navigate(buildLoginPath(newProjectPath));
  };

  return (
    <form
      data-component='hero-prompt'
      onSubmit={event => {
        event.preventDefault();
        submitIdea();
      }}
      className={cn(
        'flex w-full max-w-xl items-end gap-2 rounded-2xl border bg-card p-2 pl-5 text-left shadow-lg shadow-brand-strong/10 transition-shadow',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25',
        className,
      )}
    >
      <textarea
        value={idea}
        onChange={event => setIdea(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={event => {
          // Enter sends, Shift+Enter is a new line. Not while an IME is composing (Vietnamese, Chinese,
          // Japanese, Korean typing), where Enter just confirms the characters.
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submitIdea();
          }
        }}
        rows={1}
        maxLength={_IDEA_MAX_LENGTH}
        aria-label={t('landing_hero_prompt_label')}
        placeholder={isFocused ? t('landing_hero_prompt_label') : typedExample.text}
        // One line tall to start, the same height as the send button (24px line + 2 × 14px padding = 52px), so
        // the text sits level with it. It grows with what's typed (field-sizing; browsers without it scroll).
        className='max-h-40 min-h-13 flex-1 resize-none bg-transparent py-3.5 text-base leading-6 outline-none field-sizing-content placeholder:text-muted-foreground'
      />
      <Button
        type='submit'
        size='icon-lg'
        disabled={!trimmedIdea}
        aria-label={t('landing_hero_prompt_submit')}
        className='rounded-xl bg-primary text-primary-foreground hover:bg-primary hover:brightness-95'
      >
        <ArrowUpIcon />
      </Button>
    </form>
  );
}
