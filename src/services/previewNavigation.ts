import _ from 'lodash';

import type { PreviewNavigation } from 'src/types/preview';

// Intentions: the site preview's browsing history — a mini browser's back/forward stack over paths of
// the previewed site. All pure: each function takes the current state and returns the next one.
//
// `entries`/`index` are where the user has been and where they are now (what the location bar shows).
// `loadCount` only moves when WE navigate (typing a path, back/forward, reload): the frame is keyed on it,
// so it reopens on the current entry. When the site moves by itself (the user clicks a link inside it) we
// only hear about it and record it — reloading the frame to a page it's already on would throw away the
// site's state.
// References: SitePreview.tsx (the frame and its toolbar).

// Origin the location bar pretends to be on; only used to parse what the user types.
const _PLACEHOLDER_ORIGIN = 'https://example.com';

// [Pure] Whatever was typed into the location bar -> a path on the site ("about" -> "/about"). A full
// URL keeps only its path, query and hash, since the domain isn't the user's to change.
function normalizePreviewPath(input: string): string {
  const url = new URL(input.trim() || '/', `${_PLACEHOLDER_ORIGIN}/`);
  return `${url.pathname}${url.search}${url.hash}`;
}

// [Pure]
function createPreviewNavigation(path = '/'): PreviewNavigation {
  return { entries: [path], index: 0, loadCount: 0 };
}

// [Pure]
function getCurrentPreviewPath(navigation: PreviewNavigation): string {
  return navigation.entries[navigation.index];
}

// [Pure] Like a browser: going somewhere new drops anything you could have gone "forward" to.
function _pushEntry(navigation: PreviewNavigation, path: string): PreviewNavigation {
  return {
    ...navigation,
    entries: [..._.take(navigation.entries, navigation.index + 1), path],
    index: navigation.index + 1,
  };
}

// [Pure]
function _loadCurrent(navigation: PreviewNavigation): PreviewNavigation {
  return { ...navigation, loadCount: navigation.loadCount + 1 };
}

// [Pure] The user typed a path. Typing the current one again just reloads it, like a browser.
function navigatePreviewTo(navigation: PreviewNavigation, path: string): PreviewNavigation {
  return path === getCurrentPreviewPath(navigation)
    ? _loadCurrent(navigation)
    : _loadCurrent(_pushEntry(navigation, path));
}

// [Pure] The site says it's now on `path`. The page we just loaded reports itself too — that's already the
// current entry, so it's a no-op.
function recordPreviewLocation(navigation: PreviewNavigation, path: string): PreviewNavigation {
  return path === getCurrentPreviewPath(navigation) ? navigation : _pushEntry(navigation, path);
}

// [Pure] `step` is -1 for back, 1 for forward. Out of range = nothing to go to, unchanged.
function stepPreviewHistory(navigation: PreviewNavigation, step: -1 | 1): PreviewNavigation {
  const nextIndex = navigation.index + step;
  if (nextIndex < 0 || nextIndex >= navigation.entries.length) {
    return navigation;
  }
  return _loadCurrent({ ...navigation, index: nextIndex });
}

// [Pure]
function reloadPreview(navigation: PreviewNavigation): PreviewNavigation {
  return _loadCurrent(navigation);
}

// [Pure]
function canStepPreviewHistory(navigation: PreviewNavigation, step: -1 | 1): boolean {
  return _.inRange(navigation.index + step, 0, navigation.entries.length);
}

export {
  normalizePreviewPath,
  createPreviewNavigation,
  getCurrentPreviewPath,
  navigatePreviewTo,
  recordPreviewLocation,
  stepPreviewHistory,
  reloadPreview,
  canStepPreviewHistory,
};
