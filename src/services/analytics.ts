import posthog from 'posthog-js';
import _ from 'lodash';

import type { User } from 'src/types/user';
import type { AnalyticsEventMap } from 'src/types/analytics';
import { getDisplayName, getUsername } from 'src/services/user';
import { ARRIVAL_SOURCE } from 'src/services/arrivalSource';

// PostHog is optional per project: with no key configured every function here is a
// no-op, so call sites never have to guard. `setAnalyticsEnabled` is the only thing that
// decides whether tracking happens at all.
const _KEY = import.meta.env.VITE_POSTHOG_KEY;
const _HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const _PROJECT_NAME = import.meta.env.VITE_PROJECT_NAME;

// _initialized: posthog.init has run (it should only run once). _enabled: tracking is currently allowed.
let _initialized = false;
let _enabled = false;

// Intentions: turns tracking on/off to follow the visitor's cookie choice (AppProvider calls it whenever
// that changes). PostHog is only loaded once they allow it, and opting out stops both events and session
// replay. Everything it stores (its id, the opt-out flag) lives in localStorage — we use no cookies for
// analytics, as the cookie policy says.
function setAnalyticsEnabled(allowed: boolean) {
  if (!_KEY || allowed === _enabled) {
    return;
  }
  if (allowed && !_initialized) {
    posthog.init(_KEY, {
      api_host: _HOST,
      // 'history_change' picks up react-router navigations too (no full page loads in an SPA),
      // so page views and page leaves need no code on our side.
      capture_pageview: 'history_change',
      persistence: 'localStorage',
      opt_out_capturing_persistence_type: 'localStorage',
      // Replay also has to be switched on in the PostHog project settings. Inputs are masked by
      // default; rendered text (chat messages, project content) is NOT — mask it with
      // `maskTextSelector` or a `ph-no-capture` class once we decide what's sensitive.
      session_recording: { maskAllInputs: true },
      // Stamps our API calls with X-POSTHOG-DISTINCT-ID / -SESSION-ID / -WINDOW-ID, so the events the backend sends tie
      // to this person's session (and show up as replay filters). Only once PostHog is on, i.e. after consent. The
      // backend's CORS has to let these headers through (it mirrors whatever's asked for). The page origin is the
      // base, so a relative API URL works too.
      tracing_headers: [new URL(import.meta.env.VITE_API_BASE_URL, window.location.origin).hostname],
    });
    _initialized = true;
  }
  if (allowed) {
    if (posthog.has_opted_out_capturing()) {
      posthog.opt_in_capturing();
    }
    // reset() and opt-outs can clear persistence, super properties included, so they're re-added on every opt-in.
    _registerAppContext();
    _recordArrivalSource();
  } else {
    posthog.opt_out_capturing();
  }
  _enabled = allowed;
}

// Intentions: where the person came from (services/arrivalSource), as person properties first_utm_source,
// first_referring_domain... -- set once, so their first known visit wins. Covers visitors who never sign up too; a
// signup sets the same ones from the backend's event. PostHog has its own $initial_utm_* as well, but takes them from
// the page it starts on, which (cookie banner, redirects) often isn't the page they arrived on. Safe to repeat.
function _recordArrivalSource() {
  if (_.isEmpty(ARRIVAL_SOURCE)) {
    return;
  }
  posthog.setPersonProperties(undefined, _.mapKeys(ARRIVAL_SOURCE, (_value, key) => `first_${key}`));
}

// Super properties ride along on every event from here on, including ones posthog fires
// itself (page views, autocapture). Lets a single posthog project serve several apps and still tell them apart.
// Kept separate because reset() clears persistence — see resetAnalytics below.
// Intention: this was originally used because the boilerplate's gonna be used for many projects
// and we want them to share the same analytics account. Remove this logic if you need to.
function _registerAppContext() {
  if (!_PROJECT_NAME) {
    return;
  }
  posthog.register({ project: _PROJECT_NAME });
}

function trackEvent<K extends keyof AnalyticsEventMap>(name: K, props: AnalyticsEventMap[K]) {
  if (!_enabled) {
    return;
  }
  posthog.capture(name, props);
}

// Ties subsequent events (and the session replay) to this user. Safe to call repeatedly — posthog
// skips the identify when the id hasn't changed. The id is the BE's user id as a string: the BE sends its own events
// (signup, payments, launches) under that same id, so they land on the same person. Guests are identified too; signing
// up keeps the guest's id, so their history carries over.
function identifyUser(user?: User | null) {
  if (!_enabled || !user) {
    return;
  }
  posthog.identify(String(user.id), _.pickBy({
    name: getDisplayName(user),
    email: getUsername(user),
    userType: user.user_type,
  }, value => !_.isNil(value)));
}

// On logout: drops the identity so the next user's events aren't merged into this one.
function resetAnalytics() {
  if (!_enabled) {
    return;
  }
  posthog.reset();
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
