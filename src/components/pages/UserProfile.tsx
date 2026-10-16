import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { useStore } from 'src/state-store';

function UserProfile() {
  const { t } = useTranslation();
  const user = useStore(state => state.user);

  return (
    <div>
      <div>
        {t('user_profile_user', { userId: _.get(user, '_id') })}
      </div>
    </div>
  );
}

export default UserProfile;
