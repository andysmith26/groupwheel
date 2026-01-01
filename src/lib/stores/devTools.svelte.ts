/**
 * devTools.svelte.ts
 *
 * Enables dev tools in production for manual testing.
 *
 * Usage:
 * - In development: always enabled
 * - In production: add ?devtools=true, ?debugMode=true, or ?debug=true to URL to enable (persists in localStorage)
 * - To disable: add ?devtools=false, ?debugMode=false, or ?debug=false or clear localStorage
 *
 * Note: This is development tooling that uses browser APIs directly.
 * This is acceptable for dev tools which are not part of the core application.
 */

const STORAGE_KEY = 'groupwheel-devtools';

// Support multiple URL parameter names for convenience
const DEBUG_PARAM_NAMES = ['devtools', 'debugMode', 'debug'];

// Check if we're in development mode (Vite sets import.meta.env.DEV)
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

function createDevToolsStore() {
	let enabled = $state(isDev);

	if (typeof window !== 'undefined') {
		// Check localStorage first
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'true') {
			enabled = true;
		}

		// Check URL params (overrides localStorage)
		// Support multiple parameter names for flexibility
		const params = new URLSearchParams(window.location.search);
		let debugParam: string | null = null;
		let paramNameUsed: string | null = null;

		for (const paramName of DEBUG_PARAM_NAMES) {
			const value = params.get(paramName);
			if (value !== null) {
				debugParam = value;
				paramNameUsed = paramName;
				break;
			}
		}

		if (debugParam === 'true') {
			enabled = true;
			localStorage.setItem(STORAGE_KEY, 'true');
			// Clean up URL without reload
			if (paramNameUsed) {
				params.delete(paramNameUsed);
			}
			const newUrl = params.toString()
				? `${window.location.pathname}?${params.toString()}`
				: window.location.pathname;
			window.history.replaceState({}, '', newUrl);
		} else if (debugParam === 'false') {
			enabled = isDev; // Fall back to actual dev mode
			localStorage.removeItem(STORAGE_KEY);
			// Clean up URL without reload
			if (paramNameUsed) {
				params.delete(paramNameUsed);
			}
			const newUrl = params.toString()
				? `${window.location.pathname}?${params.toString()}`
				: window.location.pathname;
			window.history.replaceState({}, '', newUrl);
		}
	}

	return {
		get enabled() {
			return enabled;
		}
	};
}

export const devTools = createDevToolsStore();
