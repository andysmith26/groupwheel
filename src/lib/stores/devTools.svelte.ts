/**
 * devTools.svelte.ts
 *
 * Enables dev tools in production for manual testing.
 *
 * Usage:
 * - In development: always enabled
 * - In production: add ?devtools=true to URL to enable (persists in localStorage)
 * - To disable: add ?devtools=false or clear localStorage
 */

import { dev, browser } from '$app/environment';

const STORAGE_KEY = 'turntable-devtools';

function createDevToolsStore() {
	let enabled = $state(dev);

	if (browser) {
		// Check localStorage first
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'true') {
			enabled = true;
		}

		// Check URL params (overrides localStorage)
		const params = new URLSearchParams(window.location.search);
		const devtoolsParam = params.get('devtools');

		if (devtoolsParam === 'true') {
			enabled = true;
			localStorage.setItem(STORAGE_KEY, 'true');
			// Clean up URL without reload
			params.delete('devtools');
			const newUrl = params.toString()
				? `${window.location.pathname}?${params.toString()}`
				: window.location.pathname;
			window.history.replaceState({}, '', newUrl);
		} else if (devtoolsParam === 'false') {
			enabled = dev; // Fall back to actual dev mode
			localStorage.removeItem(STORAGE_KEY);
			// Clean up URL without reload
			params.delete('devtools');
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
