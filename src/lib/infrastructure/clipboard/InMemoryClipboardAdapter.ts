/**
 * In-Memory Clipboard Adapter
 *
 * Implements ClipboardPort for testing.
 *
 * @module infrastructure/clipboard/InMemoryClipboardAdapter
 */

import type { ClipboardPort } from '$lib/application/ports/ClipboardPort';

export class InMemoryClipboardAdapter implements ClipboardPort {
	private content: string | null = null;
	private writeLog: string[] = [];

	async writeText(text: string): Promise<boolean> {
		this.content = text;
		this.writeLog.push(text);
		return true;
	}

	async readText(): Promise<string | null> {
		return this.content;
	}

	// Test helpers

	/**
	 * Get the current clipboard content.
	 */
	getContent(): string | null {
		return this.content;
	}

	/**
	 * Get all text that has been written to the clipboard.
	 */
	getWriteLog(): string[] {
		return [...this.writeLog];
	}

	/**
	 * Clear the clipboard and write log.
	 */
	clear(): void {
		this.content = null;
		this.writeLog = [];
	}
}
