import { useTranslation } from 'react-i18next';

const PrivacyPolicy = () => {
  // [OPTIONS] populate/user the privacy policy page as needed.
  const { t, i18n } = useTranslation();

  return (
    <div className='mx-auto max-w-3xl'>
      <div className='py-4'>
        <h1 className='mb-4 text-3xl font-semibold'>
          {t('privacy_policy_title')}
        </h1>

        <p className='mb-4'>
          {t('privacy_policy_last_update', { date: new Date().toLocaleDateString(i18n.resolvedLanguage) })}
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
