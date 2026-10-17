import _ from 'lodash';

import type { User } from 'src/types/user';
import { USER_TYPES } from 'src/utils/constants';

function getUsername(user?: User | null) {
  return _.get(user, 'social_data.email') || _.get(user, 'username');
}

// [Pure] What to call the user on screen: their first + last name. Accounts from before names were asked
// for fall back to the part of the email before the @, so the full address is never what's shown.
function getDisplayName(user?: User | null) {
  const fullName = _.trim(`${_.get(user, 'first_name') || ''} ${_.get(user, 'last_name') || ''}`);
  return fullName || _.head(_.split(getUsername(user) || '', '@')) || '';
}

// [Pure-ish] Where to load the user's picture from, or undefined for none. One they uploaded is stored as a
// path on the API (/avatars/...), so it gets the API's base in front; Google's is already a full URL.
function getAvatarUrl(user?: User | null) {
  const picture = user?.profile_picture;
  if (!picture) {
    return undefined;
  }
  return _.startsWith(picture, '/') ? `${import.meta.env.VITE_API_BASE_URL}${picture}` : picture;
}

// [Pure] A real, signed-in account — guests (auto-minted sessions) don't count.
function isSignedInUser(user?: User | null) {
  return Boolean(user) && user?.user_type !== USER_TYPES.GUEST;
}

export {
  getAvatarUrl,
  getUsername,
  getDisplayName,
  isSignedInUser,
};
