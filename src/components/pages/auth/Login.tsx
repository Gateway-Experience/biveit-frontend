import _ from 'lodash';
import { useNavigate, useSearchParams } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import FormField from 'src/components/common/FormField';
import { useNotification } from 'src/components/common/NotificationProvider';
import AuthPageLayout from 'src/components/pages/auth/AuthPageLayout';
import { EMAIL_PATTERN } from 'src/components/pages/auth/authForm';
import { Button } from 'src/components/shadui/button';
import { Spinner } from 'src/components/common/Spinner';
import { useStore } from 'src/state-store';
import { callBe } from 'src/utils/request';
import { PATHS } from 'src/utils/constants';
import { getSafeNextPath } from 'src/utils/authRedirect';
import { useOneTimeQueryParams } from 'src/utils/hooks';

type LoginFormValues = {
  email: string;
  password: string;
};

// Intentions: maps the `?error=<CODE>` the BE puts on /login after a failed Google sign-in to what we
// tell the user. Unknown codes fall back to the generic message.
// References: fourpixie-backend/docs/google-login-fe-handoff.md §2 (error table)
const GOOGLE_ERROR_I18N_KEYS: Record<string, string> = {
  ACCESS_DENIED: 'google_error_access_denied',
  EMAIL_NOT_VERIFIED: 'google_error_email_not_verified',
  INVALID_STATE: 'google_error_invalid_state',
  GOOGLE_LOGIN_DISABLED: 'google_error_unavailable',
  // A Google sign-up whose email already belongs to a password account — no auto-linking, so we
  // point them at the password form right below.
  EMAIL_TAKEN: 'google_error_email_taken',
};

// Original purpose: the /login page. After logging in (email or Google) the user goes back to the
// `?next=` page they came from — see utils/authRedirect.ts for who sets it.
// References: fourpixie-backend/docs/google-login-fe-handoff.md §2–3 for the BE contract.
export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotification();
  const set = useStore(state => state.set);
  const [searchParams] = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get('next'));

  const { control, handleSubmit, setError, formState: { isSubmitting, errors } } = useForm<LoginFormValues>({
    mode: 'onSubmit',
    defaultValues: { email: '', password: '' },
  });

  // Show a failed Google sign-in once, then strip `?error=` so a refresh doesn't show it again
  // (`next` is left alone).
  useOneTimeQueryParams(['error'], ({ error }) => {
    if (!error) {
      return;
    }
    // A cancel is the user's own choice, so it's info rather than an error.
    notify(error === 'ACCESS_DENIED' ? 'info' : 'error', t(_.get(GOOGLE_ERROR_I18N_KEYS, error, 'google_error_generic')));
  });

  const loginWithEmail = async ({ email, password }: LoginFormValues) => {
    try {
      // `username` is the email in the BE contract. The session comes back as an httpOnly cookie;
      // the body's `token` is ignored on purpose.
      const { user } = await callBe({
        url: '/user/authenticate',
        method: 'POST',
        data: { username: email, password },
      });
      set({ user });
      navigate(nextPath, { replace: true });
    } catch (error) {
      // The BE gives one opaque answer for wrong password and unknown email (so the form can't be used
      // to probe which emails have accounts) — and Google-only accounts land here too, since they
      // have no password. Hence the one message that points at the Google button.
      if (_.includes(['INVALID_CREDENTIALS', 'USER_NOT_FOUND'], _.get(error, 'data.detail'))) {
        setError('root.credentials', { message: t('login_invalid_credentials') });
        return;
      }
      notify('error', t('login_failed'));
    }
  };

  return (
    <AuthPageLayout
      pageName='login'
      title={t('login_title')}
      googleNextPath={nextPath}
      switchPrompt={t('login_no_account')}
      switchLinkLabel={t('login_create_account')}
      switchLinkTo={PATHS.register}
    >
      <form noValidate onSubmit={handleSubmit(loginWithEmail)} className='flex flex-col gap-4'>
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

        {/* No length rule here: an older account with a shorter password must still be able to log in. */}
        <Controller
          name='password'
          control={control}
          rules={{ required: t('auth_password_required') }}
          render={(field) => (
            <FormField
              label={t('auth_password_label')}
              type='password'
              autoComplete='current-password'
              placeholder={t('auth_password_placeholder_current')}
              fullWidth
              value={field.field.value}
              onChange={field.field.onChange}
              error={!_.isNil(_.get(field, 'fieldState.error'))}
              helperText={_.get(field, 'fieldState.error.message')}
            />
          )}
        />

        {errors.root?.credentials && (
          <p data-loginerror='credentials' className='text-sm text-destructive'>{errors.root.credentials.message}</p>
        )}

        <Button type='submit' className='mt-1 w-full' disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {t('login_submit')}
        </Button>
      </form>
    </AuthPageLayout>
  );
}
