/**
 * devTools.svelte.ts
 *
 * Enables dev tools in production for manual testing.
 *
 * Usage:
 * - In development: always enabled
 * - In production: add ?devtools=true, ?debugMode=true, or ?debug=true to URL to enable (persists in localStorage)
 * - To disable: add ?devtools=false, ?debugMode=false, or ?debug=false or clear localStorage
 */

import { dev, browser } from '$app/environment';

const STORAGE_KEY = 'groupwheel-devtools';

// Support multiple URL parameter names for convenience
const DEBUG_PARAM_NAMES = ['devtools', 'debugMode', 'debug'];

function createDevToolsStore() {
	let enabled = $state(dev);

	if (browser) {
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
			enabled = dev; // Fall back to actual dev mode
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
