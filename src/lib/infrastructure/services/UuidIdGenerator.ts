import type { IdGenerator } from '$lib/application/ports/IdGenerator';

/**
 * IdGenerator implementation using crypto.randomUUID().
 *
 * This relies on the Web Crypto API, which is available in modern
 * browsers and in recent Node versions (which Vite uses under the hood).
 */
export class UuidIdGenerator implements IdGenerator {
	generateId(): string {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}

		// Fallback for environments without crypto.randomUUID (should be rare).
		// This is not cryptographically strong; it's only for non-sensitive IDs.
		return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
	}
}