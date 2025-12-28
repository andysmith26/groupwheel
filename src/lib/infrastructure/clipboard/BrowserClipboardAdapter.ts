/**
 * Browser Clipboard Adapter
 *
 * Implements ClipboardPort using the browser's Clipboard API.
 *
 * @module infrastructure/clipboard/BrowserClipboardAdapter
 */

import type { ClipboardPort } from '$lib/application/ports/ClipboardPort';

export class BrowserClipboardAdapter implements ClipboardPort {
	async writeText(text: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Fallback for older browsers or when clipboard API is unavailable
			return this.fallbackCopy(text);
		}
	}

	async readText(): Promise<string | null> {
		try {
			return await navigator.clipboard.readText();
		} catch {
			return null;
		}
	}

	private fallbackCopy(text: string): boolean {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand('copy');
			return true;
		} catch {
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	}
}
