/**
 * Paste detection utilities for the wizard roster import.
 *
 * Detects when pasted text is a simple one-name-per-line list
 * (no CSV/TSV structure) and provides parsed names directly,
 * bypassing column mapping.
 *
 * @module utils/pasteDetection
 */

export interface SimpleNameListResult {
	isSimpleNameList: true;
	names: string[];
}

export interface NotSimpleNameList {
	isSimpleNameList: false;
}

export type NameListDetectionResult = SimpleNameListResult | NotSimpleNameList;

/**
 * Detect if pasted text is a simple list of names (one per line, no delimiters).
 *
 * A paste is treated as a "simple name list" when:
 * 1. No line contains a comma or tab character.
 * 2. At least 2 non-empty lines exist.
 * 3. No line exceeds 100 characters (long lines suggest paragraphs, not names).
 */
export function detectSimpleNameList(text: string): NameListDetectionResult {
	const trimmed = text.trim();
	if (!trimmed) {
		return { isSimpleNameList: false };
	}

	const lines = trimmed
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	// Need at least 2 non-empty lines
	if (lines.length < 2) {
		return { isSimpleNameList: false };
	}

	// Check for delimiters and line length
	for (const line of lines) {
		if (line.includes(',') || line.includes('\t')) {
			return { isSimpleNameList: false };
		}
		if (line.length > 100) {
			return { isSimpleNameList: false };
		}
	}

	return {
		isSimpleNameList: true,
		names: lines
	};
}
