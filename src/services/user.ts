import _ from 'lodash';

import type { User, UserTour } from 'src/types/user';
import { USER_TYPES } from 'src/utils/constants';
import { callBe } from 'src/utils/request';

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

// Only decides what the FE shows: the admin endpoints check the role themselves.
function isAdminUser(user?: User | null) {
  return isSignedInUser(user) && user?.role === 'ADMIN';
}

// [Pure] Whether the user is done with one of the guided tours (finished or skipped it): the BE stamps
// `<tour>_tour_finished_at` into their meta. References: biveit-backend services/users.finish_tour
function hasFinishedTour(user: User | null | undefined, tour: UserTour) {
  return !!user?.meta?.[`${tour}_tour_finished_at`];
}

// Records on the account that the user is done with a tour, so it isn't shown again on any device. Resolves
// to the updated user.
function finishUserTour(tour: UserTour): Promise<User> {
  return callBe({ method: 'POST', url: `/me/tours/${tour}/finish` });
}

export {
  finishUserTour,
  getAvatarUrl,
  getUsername,
  getDisplayName,
  hasFinishedTour,
  isSignedInUser,
  isAdminUser,
};
