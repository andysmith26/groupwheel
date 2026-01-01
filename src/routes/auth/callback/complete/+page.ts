/**
 * Disable SSR for the OAuth callback completion page.
 *
 * This page requires browser APIs (document.cookie, IndexedDB) and the
 * app environment context which is only set up client-side.
 */
export const ssr = false;
