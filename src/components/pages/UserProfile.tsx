import { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CreditCardIcon, ExternalLinkIcon, KeyRoundIcon, PencilIcon, Trash2Icon, UserRoundIcon } from 'lucide-react';
import { cn } from 'cn';

import FormField from 'src/components/common/FormField';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import { MIN_PASSWORD_LENGTH, NAME_MAX_LENGTH } from 'src/components/pages/auth/authForm';
import { Avatar, AvatarFallback, AvatarImage } from 'src/components/shadui/avatar';
import { Button } from 'src/components/shadui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/components/shadui/card';
import { useStore } from 'src/state-store';
import { getAvatarUrl, getDisplayName, getUsername } from 'src/services/user';
import type { User } from 'src/types/user';
import { useUpdateUser } from 'src/utils/hooks';
import { callBe } from 'src/utils/request';

type NameFormValues = { firstName: string; lastName: string };
type PasswordFormValues = { currentPassword: string; newPassword: string; repeatPassword: string };

// One card on the page: an icon, a title and a line saying what it's for, then its form.
function ProfileSection({ Icon, title, description, children }: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-start gap-3'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-brand-strong'>
          <Icon className='size-4.5' />
        </span>
        <div className='flex flex-col gap-1'>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Mirrors the BE's AVATAR_MAX_BYTES and the types it takes (it checks the file's bytes either way; this
// just saves a pointless upload).
const _AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const _AVATAR_TYPES = 'image/png,image/jpeg,image/gif,image/webp';

// Intentions: the user's picture, with a small Edit button on its top right corner (pick an image file, it's
// uploaded straight away) and a Delete one on its bottom right (back to their initial). Shown next to their
// name and email.
function AvatarEditor() {
  const { t } = useTranslation();
  const notify = useNotification();
  const user = useStore(state => state.user);
  const set = useStore(state => state.set);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveAvatar = async (request: () => Promise<User>) => {
    setIsSaving(true);
    try {
      set({ user: await request() });
      notify('success', t('profile_avatar_saved'));
    } catch (error) {
      notify('error', _.get(error, 'data.detail') === 'INVALID_AVATAR' ? t('profile_avatar_invalid') : t('profile_save_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  const uploadPickedFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = _.head(event.target.files);
    // Cleared so picking the same file again still counts as a change.
    event.target.value = '';
    if (!file) {
      return;
    }
    if (file.size > _AVATAR_MAX_BYTES || !_.includes(_.split(_AVATAR_TYPES, ','), file.type)) {
      notify('error', t('profile_avatar_invalid'));
      return;
    }
    const form = new FormData();
    form.append('file', file);
    saveAvatar(() => callBe({ method: 'PUT', url: '/me/avatar', data: form }));
  };

  // The two corner buttons: small round chips sitting on the avatar's edge.
  const cornerButtonClass = 'absolute size-7 rounded-full bg-card shadow-md ring-1 ring-foreground/10';

  return (
    <div className='mb-6 flex flex-wrap items-center gap-4'>
      <div data-component='avatar-editor' className='relative shrink-0'>
        <Avatar className='size-20 text-2xl'>
          <AvatarImage src={getAvatarUrl(user)} className='object-cover' />
          <AvatarFallback>{(getDisplayName(user) || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        {isSaving && (
          <span className='absolute inset-0 flex items-center justify-center rounded-full bg-scrim text-scrim-foreground'>
            <Spinner className='size-5' />
          </span>
        )}
        <Button
          type='button'
          variant='outline'
          size='icon-xs'
          aria-label={t('profile_avatar_change')}
          title={t('profile_avatar_change')}
          disabled={isSaving}
          onClick={() => fileInputRef.current?.click()}
          className={cn(cornerButtonClass, '-top-1 -right-1')}
        >
          <PencilIcon className='size-3.5' />
        </Button>
        {/* Only when there's a picture to remove; without one the avatar already shows their initial. */}
        {user?.profile_picture && (
          <Button
            type='button'
            variant='outline'
            size='icon-xs'
            aria-label={t('profile_avatar_remove')}
            title={t('profile_avatar_remove')}
            disabled={isSaving}
            onClick={() => saveAvatar(() => callBe({ method: 'DELETE', url: '/me/avatar' }))}
            className={cn(cornerButtonClass, '-right-1 -bottom-1 text-destructive hover:text-destructive')}
          >
            <Trash2Icon className='size-3.5' />
          </Button>
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate font-medium'>{getDisplayName(user)}</p>
        {/* Their own page, so this is the one place the full email shows. */}
        <p className='truncate text-sm text-muted-foreground'>{getUsername(user)}</p>
      </div>
      <input ref={fileInputRef} type='file' accept={_AVATAR_TYPES} className='hidden' onChange={uploadPickedFile} />
    </div>
  );
}

// The user's picture and name, which the sidebar and the rest of the app show instead of their email.
function NameSection() {
  const { t } = useTranslation();
  const notify = useNotification();
  const user = useStore(state => state.user);
  const updateUser = useUpdateUser();
  const { control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<NameFormValues>({
    mode: 'onSubmit',
    defaultValues: { firstName: user?.first_name || '', lastName: user?.last_name || '' },
  });

  // The user can arrive before /me has answered: fill the form in once it has.
  useEffect(() => {
    reset({ firstName: user?.first_name || '', lastName: user?.last_name || '' });
  }, [user?.first_name, user?.last_name, reset]);

  const saveName = async ({ firstName, lastName }: NameFormValues) => {
    try {
      await updateUser({ first_name: _.trim(firstName), last_name: _.trim(lastName) });
      notify('success', t('profile_name_saved'));
    } catch {
      notify('error', t('profile_save_failed'));
    }
  };

  return (
    <ProfileSection Icon={UserRoundIcon} title={t('profile_details_title')} description={t('profile_details_description')}>
      <AvatarEditor />
      <form noValidate onSubmit={handleSubmit(saveName)} className='flex flex-col gap-4'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Controller
            name='firstName'
            control={control}
            rules={{ validate: value => !_.isEmpty(_.trim(value)) || t('auth_first_name_required') }}
            render={({ field, fieldState }) => (
              <FormField
                label={t('auth_first_name_label')}
                autoComplete='given-name'
                maxLength={NAME_MAX_LENGTH}
                fullWidth
                value={field.value}
                onChange={field.onChange}
                error={!_.isNil(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name='lastName'
            control={control}
            render={({ field }) => (
              <FormField
                label={t('auth_last_name_label')}
                autoComplete='family-name'
                maxLength={NAME_MAX_LENGTH}
                fullWidth
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <Button type='submit' className='self-start' disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Spinner data-icon='inline-start' />}
          {t('profile_save')}
        </Button>
      </form>
    </ProfileSection>
  );
}

// Change the password — or, for an account that signed up with Google and has none, set a first one
// (then there's no current password to ask for, and they can log in with email + password too).
function PasswordSection() {
  const { t } = useTranslation();
  const notify = useNotification();
  const user = useStore(state => state.user);
  const set = useStore(state => state.set);
  const hasPassword = user?.has_password !== false;
  const { control, handleSubmit, getValues, reset, setError, formState: { isSubmitting } } = useForm<PasswordFormValues>({
    mode: 'onSubmit',
    defaultValues: { currentPassword: '', newPassword: '', repeatPassword: '' },
  });

  const savePassword = async ({ currentPassword, newPassword }: PasswordFormValues) => {
    try {
      await callBe({
        method: 'POST',
        url: '/me/password',
        data: { current_password: hasPassword ? currentPassword : null, new_password: newPassword },
      });
      reset();
      if (user && !hasPassword) {
        set({ user: { ...user, has_password: true } });
      }
      notify('success', t('profile_password_saved'));
    } catch (error) {
      if (_.get(error, 'data.detail') === 'WRONG_PASSWORD') {
        setError('currentPassword', { message: t('profile_password_wrong') });
        return;
      }
      notify('error', t('profile_save_failed'));
    }
  };

  return (
    <ProfileSection
      Icon={KeyRoundIcon}
      title={hasPassword ? t('profile_password_title') : t('profile_password_set_title')}
      description={hasPassword ? t('profile_password_description') : t('profile_password_set_description')}
    >
      <form noValidate onSubmit={handleSubmit(savePassword)} className='flex flex-col gap-4'>
        {hasPassword && (
          <Controller
            name='currentPassword'
            control={control}
            rules={{ required: t('auth_password_required') }}
            render={({ field, fieldState }) => (
              <FormField
                label={t('profile_password_current')}
                type='password'
                autoComplete='current-password'
                fullWidth
                value={field.value}
                onChange={field.onChange}
                error={!_.isNil(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        )}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Controller
            name='newPassword'
            control={control}
            rules={{
              required: t('auth_password_required'),
              minLength: { value: MIN_PASSWORD_LENGTH, message: t('auth_password_min_length', { count: MIN_PASSWORD_LENGTH }) },
            }}
            render={({ field, fieldState }) => (
              <FormField
                label={t('reset_password_new_label')}
                type='password'
                autoComplete='new-password'
                placeholder={t('auth_password_placeholder_new', { count: MIN_PASSWORD_LENGTH })}
                fullWidth
                value={field.value}
                onChange={field.onChange}
                error={!_.isNil(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name='repeatPassword'
            control={control}
            rules={{
              required: t('auth_repeat_password_required'),
              validate: repeatPassword => repeatPassword === getValues('newPassword') || t('password_dont_match'),
            }}
            render={({ field, fieldState }) => (
              <FormField
                label={t('auth_repeat_password_label')}
                type='password'
                autoComplete='new-password'
                fullWidth
                value={field.value}
                onChange={field.onChange}
                error={!_.isNil(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </div>
        <Button type='submit' className='self-start' disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon='inline-start' />}
          {hasPassword ? t('profile_password_submit') : t('profile_password_set_submit')}
        </Button>
      </form>
    </ProfileSection>
  );
}

// Intentions: where the user manages what they pay for -- plan and domain subscriptions, invoices, payment method,
// cancelling. All of it lives with Polar (our payment provider), so this just links to its customer portal; the BE
// says which portal (live, or the sandbox in sandbox mode). Cancelling there reaches us by webhook.
function BillingSection() {
  const { t } = useTranslation();
  const { data: portal } = useQuery({ queryKey: ['payments', 'portal'], queryFn: () => callBe('/payments/portal'), staleTime: Infinity });

  return (
    <ProfileSection Icon={CreditCardIcon} title={t('profile_billing_title')} description={t('profile_billing_description')}>
      <div className='flex flex-wrap items-center gap-3'>
        <Button variant='outline' disabled={!portal} data-action='manage-billing' nativeButton={false} render={<a href={portal?.url} target='_blank' rel='noopener noreferrer' />}>
          {t('profile_billing_manage')}
          <ExternalLinkIcon data-icon='inline-end' />
        </Button>
        <p className='text-xs text-muted-foreground'>{t('profile_billing_sign_in_hint')}</p>
      </div>
    </ProfileSection>
  );
}

// Original purpose: the profile page, from the account menu's "Profile settings".
function UserProfile() {
  const { t } = useTranslation();

  return (
    <div data-page='user-profile' className='flex flex-col gap-6'>
      <div>
        <h1 className='font-heading text-3xl font-bold tracking-[-0.03em]'>{t('profile_title')}</h1>
        <p className='mt-1 text-muted-foreground'>{t('profile_subtitle')}</p>
      </div>
      <NameSection />
      <PasswordSection />
      <BillingSection />
    </div>
  );
}

export default UserProfile;
