import mixpanel from 'mixpanel-browser';
import _ from 'lodash';

import type { User } from 'src/types/user';
import { getUsername } from 'src/services/user';

// Mixpanel is optional per project: with no token configured every function here is a
// no-op, so call sites never have to guard. `setAnalyticsEnabled` is the only thing that
// decides whether tracking happens at all.
const _TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const _PROJECT_NAME = import.meta.env.VITE_PROJECT_NAME;

// _initialized: mixpanel.init has run (it can only run once). _enabled: tracking is currently allowed.
let _initialized = false;
let _enabled = false;

type EventProps = Record<string, unknown>;

// Intentions: turns tracking on/off to follow the visitor's cookie choice (AppProvider calls it whenever
// that changes). Mixpanel is only loaded once they allow it. Opting out wipes mixpanel's stored id, and
// its opt-out flag lives in localStorage too — we use no cookies for analytics, as the cookie policy says.
function setAnalyticsEnabled(allowed: boolean) {
  if (!_TOKEN || allowed === _enabled) {
    return;
  }
  if (allowed && !_initialized) {
    mixpanel.init(_TOKEN, {
      // We fire page views ourselves on route change — react-router doesn't do full page
      // loads, so mixpanel's own pageview tracking would only ever see the first one.
      track_pageview: false,
      persistence: 'localStorage',
      opt_out_tracking_persistence_type: 'localStorage',
      debug: import.meta.env.DEV,
    });
    _initialized = true;
  }
  if (allowed) {
    if (mixpanel.has_opted_out_tracking()) {
      mixpanel.opt_in_tracking();
    }
    // Opting out cleared persistence, super properties included, so they're re-added on every opt-in.
    _registerAppContext();
  } else {
    mixpanel.opt_out_tracking();
  }
  _enabled = allowed;
}

// Super properties ride along on every event from here on, including ones mixpanel fires
// itself. Lets a single mixpanel project serve several apps and still tell them apart.
// Kept separate because reset() clears persistence — see resetAnalytics below.
// Intention: this was originally used because the boilerplate's gonna be used for many projects
// and we want them to share the same mixpanel account. Remove this logic if you need to.
function _registerAppContext() {
  if (!_PROJECT_NAME) {
    return;
  }
  mixpanel.register({ $project: _PROJECT_NAME });
}

function trackEvent(name: string, props: EventProps = {}) {
  if (!_enabled) {
    return;
  }
  mixpanel.track(name, props);
}

// Ties subsequent events to this user. Safe to call repeatedly — mixpanel dedupes by id.
function identifyUser(user?: User | null) {
  if (!_enabled || !user) {
    return;
  }
  mixpanel.identify(user._id);
  mixpanel.people.set(_.pickBy({
    $name: getUsername(user),
    $email: _.get(user, 'social_data.email'),
    userType: user.user_type,
  }, value => !_.isNil(value)));
}

// On logout: drops the identity so the next user's events aren't merged into this one.
function resetAnalytics() {
  if (!_enabled) {
    return;
  }
  mixpanel.reset();
  // reset() clears persistence, super properties included — without this the `project`
  // tag would quietly disappear from every event after the first logout.
  _registerAppContext();
}

export {
  setAnalyticsEnabled,
  trackEvent,
  identifyUser,
  resetAnalytics,
};
