import _ from 'lodash';

// Intentions: where this visitor came from -- an ad's utm_* tags, the site that linked here, and an ad platform's click
// id (gclid: Google Ads, fbclid: Facebook). A signup sends it to the backend, which keeps it on the new account
// (meta.signup_source) and puts it on its user_signed_up event; analytics also sets it on the person (first_*).
// Read once, as the app loads: before any redirect (e.g. /projects -> /login) drops the URL's params. It's only kept
// in memory, so a full reload before signing up loses it.
// References: biveit-landing utils/arrivalSource (passes its own visitor's source on to the app's links, with the
// referrer as `ref`), biveit-backend dto/users.SignupSource (the same fields).

type ArrivalSource = Partial<Record<
  'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content' | 'referring_domain' | 'gclid' | 'fbclid',
  string
>>;

const _URL_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] as const;

// [Pure] The source a page load carries: the URL's params, and the referring site's domain -- the landing site's
// `ref` (the browser's own referrer would only say biveit.com), else whatever site linked straight here. Moving
// between the app's own pages isn't a source. `ref=direct` is the landing site's word for a visit that reached it with
// no source (typed in, a bookmark, a messaging app); no referring_domain at all means one that came straight here.
function readArrivalSource(url: URL, referrer: string): ArrivalSource {
  const referrerHost = referrer ? new URL(referrer).hostname : '';
  return _.pickBy({
    ..._.fromPairs(_.map(_URL_PARAMS, name => [name, url.searchParams.get(name)])),
    referring_domain: url.searchParams.get('ref') || (referrerHost !== url.hostname ? referrerHost : null),
  }, _.identity) as ArrivalSource;
}

const ARRIVAL_SOURCE = readArrivalSource(new URL(window.location.href), document.referrer);

// `url` (the landing site's) with this visit's source added, in the landing site's own words: the tags and click ids
// as they are, the referring domain as `ref`. For sending a visitor over there (routes RedirectToLanding) without
// losing where they came from -- otherwise the landing would only see that the app sent them.
function withArrivalSource(url: string) {
  const { referring_domain: referringDomain, ...urlTags } = ARRIVAL_SOURCE;
  const target = new URL(url, window.location.href);
  const params = new URLSearchParams({
    ...Object.fromEntries(target.searchParams),
    ...urlTags,
    ...(referringDomain ? { ref: referringDomain } : {}),
  });
  return _.isEmpty(ARRIVAL_SOURCE) ? url : `${target.origin}${target.pathname}?${params}${target.hash}`;
}

export type { ArrivalSource };
export {
  ARRIVAL_SOURCE,
  readArrivalSource,
  withArrivalSource,
};
