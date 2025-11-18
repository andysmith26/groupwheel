/**
 * Context provider for read-only application data.
 *
 * This context makes studentsById and preferencesById available to deeply nested components
 * without prop drilling. We use context for this data because:
 *
 * 1. It's loaded once per session and doesn't change
 * 2. Many components need access (cards, inspector, columns)
 * 3. It's read-only reference data (not reactive UI state)
 */

import { getContext, setContext } from 'svelte';
import type { Student } from '$lib/types';
import type { StudentPreference } from '$lib/types/preferences';

export interface AppDataContext {
	/**
	 * Lookup table of students by ID.
	 */
	studentsById: Record<string, Student>;
	/**
	 * Lookup table of preferences by student ID.
	 * This is populated after importing preference data. It may be empty.
	 */
	preferencesById: Record<string, StudentPreference>;
}

const APP_DATA_KEY = Symbol('appData');

/**
 * Set up the context in a parent component (typically +page.svelte).
 * This should be called once, at the root of your component tree.
 */
export function setAppDataContext(data: AppDataContext): void {
	setContext(APP_DATA_KEY, data);
}

/**
 * Access the context in any child component.
 * Throws if called outside the context provider.
 */
export function getAppDataContext(): AppDataContext {
	const context = getContext<AppDataContext>(APP_DATA_KEY);
	if (!context) {
		throw new Error(
			'getAppDataContext() called outside of context provider. ' +
				'Make sure setAppDataContext() is called in a parent component.'
		);
	}
	return context;
}
