import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useSearchParams, useLocation } from 'react-router';
import _ from 'lodash';
import { useQuery } from '@tanstack/react-query';

import { useStore } from 'src/state-store';
import { trackEvent, identifyUser, resetAnalytics } from 'src/services/analytics';

// `T` could itself be a function, so TS can't narrow `typeof update === 'function'`.
// Resolve the updater in one place instead of casting all over.
type Updater<T> = T | ((prev: T) => T);

function _resolveUpdate<T>(update: Updater<T>, prev: T): T {
  return typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
}
import { callBe } from 'src/utils/request';

// Manage an indexed list. Provide a function `keyedBy` to calculate the indexing key from the item.
function useIndexedList<T>(initial: T[] | null | undefined, keyedBy: (item: T) => string) {
  const [list, setList] = useState<Record<string, T> | null | undefined>(initial ? _.keyBy(initial, keyedBy) : initial);

  const setIndexedList = useCallback((newList: T[] | null | undefined) => {
    if (!newList) {
      return setList(newList);
    }
    return setList(_.keyBy(newList, keyedBy));
  }, [setList, keyedBy]);

  const setElem = useCallback((update: Updater<T>, prevKey?: string) => {
    setList(prevList => {
      const newList: Record<string, T> = prevKey !== undefined
        ? _.omit(prevList ?? {}, [prevKey])
        : { ...prevList };
      const prevElem = prevKey !== undefined ? _.get(prevList, prevKey) : undefined;
      const newElem = _resolveUpdate(update, prevElem as T);
      newList[keyedBy(newElem)] = newElem;
      return newList;
    });
  }, [setList, keyedBy]);

  const removeElem = useCallback((elem: T) => {
    setList(prevList => {
      return _.omit(prevList, [keyedBy(elem)]);
    });
  }, [setList, keyedBy]);

  const removeElemByKey = useCallback((key: string) => {
    setList(prevList => {
      return _.omit(prevList, [key]);
    });
  }, [setList]);

  return { list, setIndexedList, setElem, removeElem, removeElemByKey };
}

// Manage an array of items, work mainly with indices.
function useArray<T>(initial: T[]) {
  const [array, setArray] = useState(initial);
  const setElem = useCallback((idx: number, update: Updater<T>) => {
    setArray(prevArray => {
      const elem = _resolveUpdate(update, prevArray[idx]);
      return [
        ...prevArray.slice(0, idx),
        elem,
        ...prevArray.slice(idx + 1),
      ];
    });
  }, [setArray]);
  const addElem = useCallback((elem: T, _idx?: number) => {
    setArray(prevArray => {
      const idx = _idx || _.size(prevArray);
      return [
        ...prevArray.slice(0, idx),
        elem,
        ...prevArray.slice(idx),
      ];
    });
  }, [setArray]);

  const removeElem = useCallback((idx: number) => {
    setArray(prevArray => {
      return [
        ...prevArray.slice(0, idx),
        ...prevArray.slice(idx + 1),
      ];
    });
  }, [setArray]);

  const swapElems = useCallback((idx1: number, idx2: number) => {
    setArray(prevArray => {
      if (idx1 === idx2) {
        return prevArray;
      }
      const smallerIdx = idx1 > idx2 ? idx2 : idx1;
      const biggerIdx = idx1 > idx2 ? idx1 : idx2;
      return [
        ...prevArray.slice(0, smallerIdx),
        prevArray[biggerIdx],
        ...prevArray.slice(smallerIdx + 1, biggerIdx),
        prevArray[smallerIdx],
        ...prevArray.slice(biggerIdx + 1),
      ];
    });
  }, [setArray]);

  return { array, setArray, setElem, addElem, removeElem, swapElems };
}

// Provide the means to use setInterval-like logic in a hook-like manner.
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(undefined);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

// Consume and remove the url query parameters.
function useOneTimeQueryParams(paramList: string[], callback: (data: Record<string, string | null>) => void) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [executed, setExecuted] = useState(false);
  useEffect(() => {
    if (executed) {
      return;
    }
    setExecuted(true);
    const data = _.fromPairs(_.map(paramList, param => ([param, searchParams.get(param)])));
    callback(data);

    const newParams = new URLSearchParams();
    for (const [key, value] of searchParams) {
      if (!_.includes(paramList, key)) {
        newParams.set(key, value);
      }
    }
    setSearchParams(newParams, { replace: true });
  }, [paramList, callback, searchParams, setSearchParams, executed, setExecuted]);
}

// How many ticks have passed since the hook was first called. set updateInterval to 1000 to count seconds.
function useElapsed(updateInterval?: number) {
  const [start] = useState(Date.now());
  const [ticks, setTicks] = useState(0);
  const [stopped, setStopped] = useState(false);
  updateInterval = updateInterval || 1000;
  const savedHandle = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  function stop() {
    setStopped(true);
    if (savedHandle.current) {
      clearInterval(savedHandle.current);
    }
  }

  useEffect(() => {
    if (stopped) {
      return;
    }
    savedHandle.current = setInterval(() => {
      const now = Date.now();
      if (now - ticks * updateInterval >= updateInterval) {
        setTicks(Math.round((now - start) / updateInterval));
      }
    }, 50);
    return () => {
      if (savedHandle.current) {
        clearInterval(savedHandle.current);
      }
    };
  }, [start, ticks, stopped, updateInterval]);

  return [ticks, stop] as const;
}

// Whether a CSS media query currently matches, kept live. E.g. `useMediaQuery('(min-width: 1024px)')`.
function useMediaQuery(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

// Self-explanatory. Heavily used for mobile-responsiveness.
// Matches tailwind's `sm` breakpoint, so `useIsMobile()` and `sm:` classes agree.
const MOBILE_QUERY = '(max-width: 639.98px)';

function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}

// The element's current content-box size, kept live; 0x0 until it's measured. Pass the returned
// callback as the element's `ref`.
function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [element, setElement] = useState<T | null>(null);
  useEffect(() => {
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, size] as const;
}

// Flips to true the first time the element scrolls into view, and stays true (it stops watching after that).
// Pass the returned callback as the element's `ref`. `bottomOffset` makes it wait until the element is
// that far above the bottom edge of the screen (e.g. '10%'), so it isn't triggered by a barely-visible sliver.
function useHasBeenInView<T extends HTMLElement>(options: { bottomOffset?: string } = {}) {
  const { bottomOffset = '0px' } = options;
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [element, setElement] = useState<T | null>(null);
  useEffect(() => {
    if (!element || hasBeenInView) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setHasBeenInView(true);
      }
    }, { rootMargin: `0px 0px -${bottomOffset} 0px` });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, hasBeenInView, bottomOffset]);
  return [setElement, hasBeenInView] as const;
}

type TypewriterState = { phraseIndex: number; typedLength: number; mode: 'typing' | 'pausing' | 'deleting' };

const TYPEWRITER_TIMING = { typeMs: 55, deleteMs: 28, pauseMs: 1800, beforeNextMs: 300 };

// [Pure] How many leading characters two phrases share (as arrays of characters).
function _countSharedPrefix(phraseA: string[], phraseB: string[]) {
  const firstMismatch = phraseA.findIndex((char, index) => char !== phraseB[index]);
  return firstMismatch === -1 ? Math.min(phraseA.length, phraseB.length) : firstMismatch;
}

// [Pure] One tick of the typewriter: the state after the current one, and how long to wait before
// showing it. Deleting only goes back to what the next phrase shares with this one (so "Build a shop…"
// to "Build a menu…" keeps "Build a "), which also means a single text slice covers both phrases.
function _stepTypewriter(state: TypewriterState, phrases: string[][]): { next: TypewriterState; delayMs: number } {
  const phrase = phrases[state.phraseIndex];
  const nextPhraseIndex = (state.phraseIndex + 1) % phrases.length;
  if (state.mode === 'typing') {
    return state.typedLength < phrase.length
      ? { next: { ...state, typedLength: state.typedLength + 1 }, delayMs: TYPEWRITER_TIMING.typeMs }
      : { next: { ...state, mode: 'pausing' }, delayMs: TYPEWRITER_TIMING.pauseMs };
  }
  if (state.mode === 'pausing') {
    return { next: { ...state, mode: 'deleting' }, delayMs: TYPEWRITER_TIMING.deleteMs };
  }
  const sharedLength = _countSharedPrefix(phrase, phrases[nextPhraseIndex]);
  return state.typedLength > sharedLength
    ? { next: { ...state, typedLength: state.typedLength - 1 }, delayMs: TYPEWRITER_TIMING.deleteMs }
    : { next: { phraseIndex: nextPhraseIndex, typedLength: sharedLength, mode: 'typing' }, delayMs: TYPEWRITER_TIMING.beforeNextMs };
}

// Types the phrases out one after another, like someone typing into a box: type, pause, backspace,
// next one, forever. Returns the text to show right now, and whether it's paused on a finished phrase
// (handy for blinking the cursor only while idle). With reduced motion on, it just shows the first phrase.
function useTypewriter(phrases: string[]) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Characters, not UTF-16 units, so nothing gets cut in half mid-letter.
  const phraseChars = phrases.map(phrase => Array.from(phrase));
  const phrasesKey = phrases.join('\n');
  const [state, setState] = useState<TypewriterState>({ phraseIndex: 0, typedLength: 0, mode: 'typing' });

  // Start over when the phrases change (e.g. the language was switched).
  useEffect(() => {
    setState({ phraseIndex: 0, typedLength: 0, mode: 'typing' });
  }, [phrasesKey]);

  useEffect(() => {
    if (prefersReducedMotion || _.isEmpty(phraseChars)) {
      return;
    }
    const { next, delayMs } = _stepTypewriter(state, phraseChars);
    const timer = setTimeout(() => setState(next), delayMs);
    return () => clearTimeout(timer);
    // phraseChars is rebuilt every render; phrasesKey stands in for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, phrasesKey, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return { text: phrases[0] ?? '', isIdle: true, phraseIndex: 0 };
  }
  const currentChars = phraseChars[state.phraseIndex] ?? [];
  return { text: currentChars.slice(0, state.typedLength).join(''), isIdle: state.mode === 'pausing', phraseIndex: state.phraseIndex };
}

// Return the previous value of a value.
// E.g. const [v, setV] = useState(1);
// const vPrev = usePrevious(v);
// setV(2);
// console.log(v, vPrev) --> 2 1
function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  },[value]);
  return ref.current;
}

function useUtm() {
  const [ params ] = useSearchParams();
  // Choosing the var/property names to be the same as the query params so it's more convenience
  // to transform between the two types.
  const utm_source = params.get('utm_source');
  const utm_medium = params.get('utm_medium');
  const utm_campaign = params.get('utm_campaign');
  const utm_term = params.get('utm_term');
  const utm_content = params.get('utm_content');

  return _.pickBy({ utm_source, utm_medium, utm_campaign, utm_term, utm_content }, _.identity);
}

function _deepCompareMemoize<T>(compareFunc: (a: T, b: T | undefined) => boolean) {
  return (value: T) => {
    const ref = useRef<T | undefined>(undefined);
    // it can be done by using useMemo as well
    // but useRef is rather cleaner and easier
    if (!compareFunc(value, ref.current)) {
      ref.current = value;
    }
    return ref.current;
  };
}

// Same as useEffect but use deep equal.
function useDeepCompareEffect(cb: React.EffectCallback, dependencies: unknown[], compareFunc = _.isEqual) {
  // eslint-disable-next-line
  useEffect(
    cb,
    dependencies.map(_deepCompareMemoize(compareFunc)),
  );
}

// For fetching static, cachable data. Uses callBe under the hood.
function useRequest(key: string | string[], axiosOptions: Parameters<typeof callBe>[0]) {
  return useQuery({
    queryKey: _.castArray(key),
    queryFn: () => callBe(axiosOptions),
    retry: false,
  });
}

// Use this hook to update user (e.g. in a User Profile page),
// it takes care of updating both frontend and backend sides.
function useUpdateUser() {
  const set = useStore(state => state.set);
  const update = useCallback(async (data: Record<string, unknown>) => {
    const updatedUser = await callBe({
      method: 'PATCH',
      url: '/me',
      data,
    });
    set({ user: updatedUser });
    return updatedUser;
  }, [set]);
  return update;
}

// Fires a page view whenever the route changes. Mounted once in the layout — react-router
// never does a full page load, so this is the only thing that sees navigations.
function useTrackPageViews() {
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view', { path: location.pathname, search: location.search });
  }, [location.pathname, location.search]);
}

// The component-facing surface. The functions are module-level singletons, so this is
// just a convenience wrapper — there's no context or state behind it.
function useAnalytics() {
  return { trackEvent, identifyUser, resetAnalytics };
}

export {
  useAnalytics,
  useTrackPageViews,
  useArray,
  useIndexedList,
  useElapsed,
  useIsMobile,
  useMediaQuery,
  useElementSize,
  useHasBeenInView,
  useTypewriter,
  usePrevious,
  useInterval,
  useOneTimeQueryParams,
  useUtm,
  useDeepCompareEffect,
  useRequest,
  useUpdateUser,
};
