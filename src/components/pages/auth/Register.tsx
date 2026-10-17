import _ from 'lodash';
import { useNavigate } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import FormField from 'src/components/common/FormField';
import { useNotification } from 'src/components/common/NotificationProvider';
import AuthPageLayout from 'src/components/pages/auth/AuthPageLayout';
import {
  AUTH_INPUT_CLASS, AUTH_SUBMIT_CLASS, EMAIL_PATTERN, MIN_PASSWORD_LENGTH, NAME_MAX_LENGTH,
} from 'src/components/pages/auth/authForm';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/common/Spinner';
import { useStore } from 'src/state-store';
import { callBe } from 'src/utils/request';
import { PATHS } from 'src/utils/constants';

type RegisterFormValues = {
  firstName: string;
  lastName: string;
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
    defaultValues: { firstName: '', lastName: '', email: '', password: '', repeatPassword: '' },
  });

  const registerWithEmail = async ({ firstName, lastName, email, password }: RegisterFormValues) => {
    try {
      // The BE contract calls it `username`; for us it's always the email. The BE sets the session as
      // an httpOnly cookie, so the `token` in the body is ignored on purpose.
      const { user } = await callBe({
        url: '/user/register',
        method: 'POST',
        data: { username: email, password, first_name: _.trim(firstName), last_name: _.trim(lastName) },
      });
      set({ user });
      navigate(AFTER_REGISTER_PATH, { replace: true });
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
      nextPath={AFTER_REGISTER_PATH}
      switchPrompt={t('register_have_account')}
      switchLinkLabel={t('register_log_in')}
      switchLinkTo={PATHS.login}
    >
      <form noValidate onSubmit={handleSubmit(registerWithEmail)} className='flex flex-col gap-4'>
        {/* What the app calls them from then on (instead of their email). Last name is optional: not
            everyone has one. */}
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
                inputClassName={AUTH_INPUT_CLASS}
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
                inputClassName={AUTH_INPUT_CLASS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

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
              inputClassName={AUTH_INPUT_CLASS}
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
              inputClassName={AUTH_INPUT_CLASS}
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
              inputClassName={AUTH_INPUT_CLASS}
              value={field.field.value}
              onChange={field.field.onChange}
              error={!_.isNil(_.get(field, 'fieldState.error'))}
              helperText={_.get(field, 'fieldState.error.message')}
            />
          )}
        />

        <Button type='submit' className={AUTH_SUBMIT_CLASS} disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {t('register_submit')}
        </Button>
      </form>
    </AuthPageLayout>
  );
}
