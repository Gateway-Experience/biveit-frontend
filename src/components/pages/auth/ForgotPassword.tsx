import _ from 'lodash';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { MailCheckIcon } from 'lucide-react';

import FormField from 'src/components/common/FormField';
import { useNotification } from 'src/components/common/NotificationProvider';
import AuthPageLayout from 'src/components/pages/auth/AuthPageLayout';
import { AUTH_INPUT_CLASS, AUTH_SUBMIT_CLASS, EMAIL_PATTERN } from 'src/components/pages/auth/authForm';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/common/Spinner';
import { callBe } from 'src/utils/request';
import { PATHS } from 'src/utils/constants';

type ForgotPasswordFormValues = {
  email: string;
};

// Original purpose: the /forgot-password page, reached from "Forgot password?" on the login page. Asks
// the BE to email a reset link, which opens /reset-password. The BE answers the same whether or not the
// email has an account, so the "sent" message is worded as "if an account exists".
export default function ForgotPassword() {
  const { t } = useTranslation();
  const notify = useNotification();
  const [searchParams] = useSearchParams();
  // Set once the request went through; switches the form for the "check your email" message.
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<ForgotPasswordFormValues>({
    mode: 'onSubmit',
    defaultValues: { email: searchParams.get('email') || '' },
  });

  const requestResetLink = async ({ email }: ForgotPasswordFormValues) => {
    try {
      await callBe({ url: '/user/forgot-password', method: 'POST', data: { email } });
      setSentToEmail(email);
    } catch {
      notify('error', t('forgot_password_failed'));
    }
  };

  return (
    <AuthPageLayout
      pageName='forgot-password'
      title={sentToEmail ? t('forgot_password_sent_title') : t('forgot_password_title')}
      subtitle={sentToEmail ? undefined : t('forgot_password_subtitle')}
      nextPath='/'
      hasGoogleSignIn={false}
      switchPrompt={t('forgot_password_remembered')}
      switchLinkLabel={t('register_log_in')}
      switchLinkTo={PATHS.login}
    >
      {sentToEmail
        ? (
          <div className='flex flex-col gap-4'>
            <div className='flex gap-3 rounded-2xl border bg-muted/40 p-4 text-sm'>
              <MailCheckIcon className='mt-0.5 size-5 shrink-0 text-primary' />
              <p>{t('forgot_password_sent_body', { email: sentToEmail })}</p>
            </div>
            {/* The BE allows one email per minute per address, so a quick second click is silently ignored. */}
            <button
              type='button'
              className='self-start text-sm font-medium text-muted-foreground hover:text-foreground hover:underline'
              onClick={() => setSentToEmail(null)}
            >
              {t('forgot_password_try_again')}
            </button>
          </div>
        )
        : (
          <form noValidate onSubmit={handleSubmit(requestResetLink)} className='flex flex-col gap-4'>
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

            <Button type='submit' className={AUTH_SUBMIT_CLASS} disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {t('forgot_password_submit')}
            </Button>
          </form>
        )}
    </AuthPageLayout>
  );
}
