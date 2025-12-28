/**
 * Clipboard Port
 *
 * Abstracts clipboard operations for testability.
 *
 * @module application/ports/ClipboardPort
 */

/**
 * Port for clipboard operations.
 */
export interface ClipboardPort {
	/**
	 * Write text to the clipboard.
	 * @returns true if successful, false otherwise
	 */
	writeText(text: string): Promise<boolean>;

	/**
	 * Read text from the clipboard.
	 * @returns clipboard text, or null if unavailable
	 */
	readText(): Promise<string | null>;
}
