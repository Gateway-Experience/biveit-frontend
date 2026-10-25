import _ from 'lodash';

import type { User, UserJourney, UserJourneyStep } from 'src/types/user';
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

// Where the user is in each journey they've started: {journey: its latest step}. A journey that isn't there
// hasn't been started.
function getMyJourneys(): Promise<Partial<Record<UserJourney, UserJourneyStep>>> {
  return callBe('/me/journeys');
}

// Logs a step the user took in a journey, on the account (so it holds on every device). Resolves to the step.
function addJourneyStep(journey: UserJourney, step: string, options: { data?: Record<string, unknown> } = {}): Promise<UserJourneyStep> {
  return callBe({ method: 'POST', url: `/me/journeys/${journey}/steps`, data: { step, data: options.data || {} } });
}

export {
  addJourneyStep,
  getAvatarUrl,
  getUsername,
  getDisplayName,
  getMyJourneys,
  isSignedInUser,
  isAdminUser,
};
