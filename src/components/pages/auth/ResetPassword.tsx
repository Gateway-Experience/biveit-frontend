import _ from 'lodash';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import FormField from 'src/components/common/FormField';
import LinkButton from 'src/components/common/LinkButton';
import { useNotification } from 'src/components/common/NotificationProvider';
import AuthPageLayout from 'src/components/pages/auth/AuthPageLayout';
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_CLASS, MIN_PASSWORD_LENGTH } from 'src/components/pages/auth/authForm';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/common/Spinner';
import { useStore } from 'src/state-store';
import { callBe } from 'src/utils/request';
import { PATHS } from 'src/utils/constants';

type ResetPasswordFormValues = {
  password: string;
  repeatPassword: string;
};

// Original purpose: the /reset-password page that the emailed link opens (?token=...). Sets the new
// password and logs the user straight in. The link works once and expires after 30 minutes; the BE
// says INVALID_RESET_TOKEN for both, and we offer a fresh one.
export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotification();
  const set = useStore(state => state.set);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  // A link with no token at all is as dead as an expired one.
  const [isLinkInvalid, setIsLinkInvalid] = useState(!token);

  const { control, handleSubmit, getValues, formState: { isSubmitting } } = useForm<ResetPasswordFormValues>({
    mode: 'onSubmit',
    defaultValues: { password: '', repeatPassword: '' },
  });

  const saveNewPassword = async ({ password }: ResetPasswordFormValues) => {
    try {
      const { user } = await callBe({ url: '/user/reset-password', method: 'POST', data: { token, password } });
      set({ user });
      // `replace` so Back doesn't return to a link that's now spent.
      navigate('/', { replace: true });
    } catch (error) {
      if (_.get(error, 'data.detail') === 'INVALID_RESET_TOKEN') {
        setIsLinkInvalid(true);
        return;
      }
      notify('error', t('reset_password_failed'));
    }
  };

  return (
    <AuthPageLayout
      pageName='reset-password'
      title={t('reset_password_title')}
      nextPath='/'
      hasGoogleSignIn={false}
      switchPrompt={t('forgot_password_remembered')}
      switchLinkLabel={t('register_log_in')}
      switchLinkTo={PATHS.login}
    >
      {isLinkInvalid
        ? (
          <div className='flex flex-col gap-4'>
            <p className='rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm'>{t('reset_password_invalid')}</p>
            <LinkButton href={PATHS.forgotPassword} className={AUTH_SUBMIT_CLASS}>
              {t('reset_password_request_new')}
            </LinkButton>
          </div>
        )
        : (
          <form noValidate onSubmit={handleSubmit(saveNewPassword)} className='flex flex-col gap-4'>
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
                  label={t('reset_password_new_label')}
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
              {t('reset_password_submit')}
            </Button>
          </form>
        )}
    </AuthPageLayout>
  );
}
