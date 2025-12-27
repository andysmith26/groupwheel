/**
 * Auth adapters.
 *
 * @module infrastructure/auth
 */

export { GoogleOAuthAdapter, type GoogleOAuthAdapterDeps } from './googleOAuth';
export { InMemoryAuthAdapter } from './InMemoryAuthAdapter';
export { getBrowserAuthAdapter, waitForAuthInit, authStore } from './browserAuth';
