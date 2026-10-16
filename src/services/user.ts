import _ from 'lodash';

import type { User } from 'src/types/user';
import { USER_TYPES } from 'src/utils/constants';

function getUsername(user?: User | null) {
  return _.get(user, 'social_data.email') || _.get(user, 'username');
}

function getFullName(user?: User | null) {
  return _.trim(_.get(user, 'full_name')) || getUsername(user);
}

// [Pure] A real, signed-in account — guests (auto-minted sessions) don't count.
function isSignedInUser(user?: User | null) {
  return Boolean(user) && user?.user_type !== USER_TYPES.GUEST;
}

export {
  getUsername,
  getFullName,
  isSignedInUser,
};
