import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { IS_TEST } from '../config';

export function pushEvent(name: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!window.__analyticsEvents) window.__analyticsEvents = [];
  window.__analyticsEvents.push({ name, payload });
  if (!IS_TEST) {
    /* In production, dispatch to analytics provider here. */
  }
}

export function useAnalyticsEvent(name: string, payload?: Record<string, unknown>, deps: unknown[] = []) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    pushEvent(name, payload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function usePageView() {
  const loc = useLocation();
  const last = useRef<string | null>(null);
  useEffect(() => {
    const p = loc.pathname + loc.search;
    if (last.current === p) return;
    last.current = p;
    pushEvent('page_view', { path: loc.pathname });
  }, [loc.pathname, loc.search]);
}

export function useAnalytics() {
  return { push: pushEvent };
}
