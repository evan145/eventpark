declare global {
  interface Window {
    __analyticsEvents?: Array<{ name: string; payload?: Record<string, unknown> }>;
  }
}

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
export const STRIPE_PK = (import.meta.env.VITE_STRIPE_PK as string | undefined) ?? 'pk_test_placeholder';
export const IS_TEST =
  (typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.MODE === 'test') ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') ||
  (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent));
export {};
