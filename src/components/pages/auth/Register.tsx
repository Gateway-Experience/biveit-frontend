import _ from 'lodash';
import { useNavigate } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import FormField from 'src/components/common/FormField';
import { useNotification } from 'src/components/common/NotificationProvider';
import AuthPageLayout from 'src/components/pages/auth/AuthPageLayout';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from 'src/components/pages/auth/authForm';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/shadui/spinner';
import { useStore } from 'src/state-store';
import { callBe } from 'src/utils/request';
import { PATHS } from 'src/utils/constants';

type RegisterFormValues = {
  email: string;
  password: string;
  repeatPassword: string;
};

// Where every new account lands. Deliberately not the `?next=` page like login does — new users go
// through the welcome flow first.
const AFTER_REGISTER_PATH = '/';

// Original purpose: the /register page — Google sign-up first, email + password sign-up below it.
// References: fourpixie-backend/docs/google-login-fe-handoff.md §2–3 for the BE contract.
export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotification();
  const set = useStore(state => state.set);

  const { control, handleSubmit, getValues, setError, formState: { isSubmitting } } = useForm<RegisterFormValues>({
    mode: 'onSubmit',
    defaultValues: { email: '', password: '', repeatPassword: '' },
  });

  const registerWithEmail = async ({ email, password }: RegisterFormValues) => {
    try {
      // The BE contract calls it `username`; for us it's always the email. The BE sets the session as
      // an httpOnly cookie, so the `token` in the body is ignored on purpose.
      const { user } = await callBe({
        url: '/user/register',
        method: 'POST',
        data: { username: email, password },
      });
      set({ user });
      navigate(AFTER_REGISTER_PATH);
    } catch (error) {
      if (_.get(error, 'data.detail') === 'DUPLICATE_USERNAME') {
        setError('email', { message: t('register_email_exists') });
        return;
      }
      notify('error', t('register_failed'));
    }
  };

  return (
    <AuthPageLayout
      pageName='register'
      eyebrow={t('register_eyebrow')}
      title={t('register_title')}
      subtitle={t('register_subtitle')}
      googleNextPath={AFTER_REGISTER_PATH}
      switchPrompt={t('register_have_account')}
      switchLinkLabel={t('register_log_in')}
      switchLinkTo={PATHS.login}
    >
      <form noValidate onSubmit={handleSubmit(registerWithEmail)} className='flex flex-col gap-4'>
        <Controller
          name='email'
          control={control}
          rules={{
            required: t('auth_email_required'),
            pattern: { value: EMAIL_PATTERN, message: t('auth_email_invalid') },
          }}
          render={(field) => (
            <FormField
              label={t('auth_email_label')}
              type='email'
              autoComplete='email'
              placeholder={t('auth_email_placeholder')}
              fullWidth
              value={field.field.value}
              onChange={field.field.onChange}
              error={!_.isNil(_.get(field, 'fieldState.error'))}
              helperText={_.get(field, 'fieldState.error.message')}
            />
          )}
        />

        <Controller
          name='password'
          control={control}
          rules={{
            required: t('auth_password_required'),
            minLength: {
              value: MIN_PASSWORD_LENGTH,
              message: t('auth_password_min_length', { count: MIN_PASSWORD_LENGTH }),
            },
          }}
          render={(field) => (
            <FormField
              label={t('auth_password_label')}
              type='password'
              autoComplete='new-password'
              placeholder={t('auth_password_placeholder_new', { count: MIN_PASSWORD_LENGTH })}
              fullWidth
              value={field.field.value}
              onChange={field.field.onChange}
              error={!_.isNil(_.get(field, 'fieldState.error'))}
              helperText={_.get(field, 'fieldState.error.message')}
            />
          )}
        />

        <Controller
          name='repeatPassword'
          control={control}
          rules={{
            required: t('auth_repeat_password_required'),
            validate: repeatPassword => repeatPassword === getValues('password') || t('password_dont_match'),
          }}
          render={(field) => (
            <FormField
              label={t('auth_repeat_password_label')}
              type='password'
              autoComplete='new-password'
              placeholder={t('auth_repeat_password_placeholder')}
              fullWidth
              value={field.field.value}
              onChange={field.field.onChange}
              error={!_.isNil(_.get(field, 'fieldState.error'))}
              helperText={_.get(field, 'fieldState.error.message')}
            />
          )}
        />

        <Button type='submit' className='mt-1 w-full' disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {t('register_submit')}
        </Button>
      </form>
    </AuthPageLayout>
  );
}
