/**
 * Storage port for key-value persistence.
 *
 * Abstracts browser localStorage or other storage backends.
 * Enables testing without browser APIs.
 *
 * @module application/ports/StoragePort
 */

export interface StoragePort {
	/**
	 * Get a value by key.
	 * @returns The stored value, or null if not found.
	 */
	get(key: string): Promise<string | null>;

	/**
	 * Set a value by key.
	 */
	set(key: string, value: string): Promise<void>;

	/**
	 * Remove a value by key.
	 */
	remove(key: string): Promise<void>;
}
