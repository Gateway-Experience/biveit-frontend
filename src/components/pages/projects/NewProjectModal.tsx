import { useEffect } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import _ from 'lodash';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';

import FormField from 'src/components/common/FormField';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Button } from 'src/components/shadui/button';
import { Checkbox } from 'src/components/shadui/checkbox';
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from 'src/components/shadui/dialog';
import { Input } from 'src/components/shadui/input';
import { Label } from 'src/components/shadui/label';
import { Spinner } from 'src/components/common/Spinner';
import { createProject } from 'src/services/project';
import { useProjectListUpdaters } from 'src/components/pages/projects/useProjectLists';
import { NEW_PROJECT_IDEA_PARAM, PATHS, SITE_KIND_OPTIONS } from 'src/utils/constants';
import { useStore } from 'src/state-store';
import { isSignedInUser } from 'src/services/user';

const _OPTION_ROW_CLASS = 'flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-base transition-colors hover:bg-muted has-data-checked:border-primary has-data-checked:bg-primary/15';

// The form fills the screen, so it reads a size up from the app's compact fields: 16px labels, fields and
// options, 14px hints.
const _LABEL_CLASS = 'text-base';
const _INPUT_CLASS = 'h-12 px-4 text-base';
const _TEXTAREA_CLASS = 'px-4 py-3 text-base';
const _HINT_CLASS = 'text-sm';

// A full-screen sheet of plain card colour that fades and rises in over the page, and scrolls itself when the
// form is taller than the screen.
const _SHEET_CLASS = 'fixed inset-0 z-50 overflow-y-auto bg-card px-4 py-16 outline-none duration-300 ease-out sm:px-8 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-open:slide-in-from-bottom-6 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-closed:slide-out-to-bottom-6';

// Each block of the form fades up a beat after the one before, once the sheet is in. `both` keeps a block
// hidden during its delay instead of flashing in first.
const _ENTER_CLASS = 'animate-in fade-in-0 slide-in-from-bottom-3 duration-500 ease-out [animation-fill-mode:both]';

// The description only needs to get the agent started; it asks about everything else in the chat. Some people
// worry they have to put the whole site in here, so past the soft limit the hint turns into a friendly "that's
// plenty", and the hard limit keeps a pasted essay out of the agent's opening brief.
const _DESCRIPTION_SOFT_LIMIT = 600;
const _DESCRIPTION_MAX_LENGTH = 4000;

// [Pure]
function _getEnterDelayStyle(order: number) {
  return { animationDelay: `${150 + order * 70}ms` };
}

type NewProjectFormValues = {
  name: string;
  description: string;
  siteKinds: string[];
  // A kind that isn't in the list, typed in. Empty = none.
  otherSiteKind: string;
};

// Original purpose: the bootstrap form — what we ask before the agent is even involved, so its first
// message can already build on something. Only the name and description are required; anything left out
// gets picked up in the chat.
// Shown as a full-screen modal over whatever page you're on (mounted in DefaultLayout), so closing it just
// leaves you where you were. Built from the dialog's parts rather than the shared
// Modal: that one always brings an 80%-black backdrop, which flashed the page dark grey on the way to white.
// The sheet is opaque and covers everything, so it needs no backdrop at all. Whether it's open is the parent's call -- except
// that an idea arriving in the URL opens it (see below). A draft survives closing and reopening it, as long as you stay
// within the same layout (it's cleared once sent).
// Flow: submit -> POST /projects -> straight into the new project's page, which opens on the chat.
export default function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const notify = useNotification();
  const navigate = useNavigate();
  const { reloadProjects } = useProjectListUpdaters();
  const { control, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<NewProjectFormValues>({
    mode: 'onSubmit',
    defaultValues: { name: '', description: '', siteKinds: [], otherSiteKind: '' },
  });
  const user = useStore(state => state.user);
  const set = useStore(state => state.set);
  const [searchParams, setSearchParams] = useSearchParams();
  const idea = searchParams.get(NEW_PROJECT_IDEA_PARAM);
  // An idea typed on the landing site arrives as /projects?idea=... (biveit-landing's HeroPrompt, through Log in): open
  // the form with it starting the description. Only once signed in -- until then the page sends them to Log in, and the
  // idea has to still be in the URL to ride along. Dropped from the URL once taken, so a refresh doesn't put it back
  // over their edits.
  useEffect(() => {
    if (!idea || !isSignedInUser(user)) {
      return;
    }
    setValue('description', idea.slice(0, _DESCRIPTION_MAX_LENGTH));
    set({ isNewProjectOpen: true });
    setSearchParams(
      previous => new URLSearchParams(_.filter([...previous], ([key]) => key !== NEW_PROJECT_IDEA_PARAM)),
      { replace: true },
    );
  }, [idea, user, setValue, set, setSearchParams]);

  const onSubmit = async (values: NewProjectFormValues) => {
    try {
      const project = await createProject({
        name: _.trim(values.name),
        bootstrap_data: {
          description: _.trim(values.description),
          site_kinds: _.compact([...values.siteKinds, _.trim(values.otherSiteKind)]),
        },
      });
      // The sidebar's recents should have it. Not awaited: the project page doesn't need the list.
      reloadProjects();
      navigate(`${PATHS.projects}/${project.id}`);
      // Closed and emptied by hand: going from one project to another keeps the same layout (and this form)
      // mounted, and the open flag lives in the store, so either would still be there otherwise.
      reset();
      onClose();
    } catch {
      notify('error', t('new_project_failed'));
    }
  };

  return (
    <Dialog
      open={open}
      // Esc closes it — but not mid-submit: the project is being created, and we're about to go to it.
      onOpenChange={nextOpen => !nextOpen && !isSubmitting && onClose()}
    >
      <DialogPortal>
        <DialogPrimitive.Popup className={_SHEET_CLASS}>
          <div data-page='new-project' className='mx-auto w-full max-w-2xl'>
            <div className={_ENTER_CLASS} style={_getEnterDelayStyle(0)}>
              <DialogTitle className='font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl'>{t('new_project_title')}</DialogTitle>
              <DialogDescription className='mt-3 text-lg text-muted-foreground'>{t('new_project_intro')}</DialogDescription>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className='mt-10 flex flex-col gap-6'>
              <div className={_ENTER_CLASS} style={_getEnterDelayStyle(1)}>
                <Controller
                  name='name'
                  control={control}
                  rules={{ validate: value => !_.isEmpty(_.trim(value)) || t('new_project_required') }}
                  render={({ field, fieldState }) => (
                    <FormField
                      label={t('new_project_name_label')}
                      placeholder={t('new_project_name_placeholder')}
                      maxLength={200}
                      labelClassName={_LABEL_CLASS}
                      inputClassName={_INPUT_CLASS}
                      fullWidth
                      disabled={isSubmitting}
                      value={field.value}
                      onChange={field.onChange}
                      error={!_.isNil(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </div>

              <div className={_ENTER_CLASS} style={_getEnterDelayStyle(2)}>
                <Controller
                  name='description'
                  control={control}
                  rules={{ validate: value => !_.isEmpty(_.trim(value)) || t('new_project_required') }}
                  render={({ field, fieldState }) => (
                    <FormField
                      label={t('new_project_description_label')}
                      placeholder={t('new_project_description_placeholder')}
                      multiline
                      minRows={6}
                      maxLength={_DESCRIPTION_MAX_LENGTH}
                      labelClassName={_LABEL_CLASS}
                      inputClassName={_TEXTAREA_CLASS}
                      helperClassName={_HINT_CLASS}
                      fullWidth
                      disabled={isSubmitting}
                      value={field.value}
                      onChange={field.onChange}
                      error={!_.isNil(fieldState.error)}
                      helperText={fieldState.error?.message || (
                        _.size(field.value) > _DESCRIPTION_SOFT_LIMIT
                          ? (
                            <span data-hint='plenty' className='flex justify-between gap-3 text-brand-strong'>
                              {t('new_project_description_plenty')}
                              <span className='shrink-0 text-muted-foreground tabular-nums'>{_.size(field.value)} / {_DESCRIPTION_MAX_LENGTH}</span>
                            </span>
                          )
                          : t('new_project_description_help')
                      )}
                    />
                  )}
                />
              </div>

              <div className={cn('flex flex-col gap-2', _ENTER_CLASS)} style={_getEnterDelayStyle(3)}>
                <Label className={_LABEL_CLASS}>{t('new_project_kind_label')}</Label>
                <p className={cn(_HINT_CLASS, 'text-muted-foreground')}>{t('new_project_kind_help')}</p>
                <Controller
                  name='siteKinds'
                  control={control}
                  render={({ field }) => (
                    <div className='grid gap-2 sm:grid-cols-2'>
                      {_.map(SITE_KIND_OPTIONS, option => (
                        <label key={option.value} data-sitekind={option.value} className={_OPTION_ROW_CLASS}>
                          <Checkbox
                            checked={_.includes(field.value, option.value)}
                            disabled={isSubmitting}
                            onCheckedChange={() => field.onChange(_.xor(field.value, [option.value]))}
                          />
                          {t(option.labelKey)}
                        </label>
                      ))}
                    </div>
                  )}
                />
                <Controller
                  name='otherSiteKind'
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder={t('new_project_kind_other_placeholder')}
                      aria-label={t('new_project_kind_other_placeholder')}
                      className={_INPUT_CLASS}
                      disabled={isSubmitting}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className={_ENTER_CLASS} style={_getEnterDelayStyle(4)}>
                <Button type='submit' size='lg' disabled={isSubmitting} className='text-base'>
                  {isSubmitting && <Spinner data-icon='inline-start' />}
                  {t('new_project_submit')}
                </Button>
              </div>
            </form>
          </div>
          {/* Last in the tab order so focus opens on the first field, but pinned to the top corner. */}
          <Button variant='ghost' size='icon' aria-label={t('new_project_close')} disabled={isSubmitting} onClick={onClose} className='fixed top-4 right-4 bg-card/90 backdrop-blur-sm hover:bg-muted'>
            <XIcon className='size-5' />
          </Button>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
