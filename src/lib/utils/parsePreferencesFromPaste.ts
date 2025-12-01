/**
 * Simple preferences parser for paste input.
 * 
 * Parses a TSV/CSV table where:
 * - First column is the student ID
 * - Subsequent columns are friend preference IDs (in order of preference)
 * 
 * This is a lightweight parser for the "quick paste" flow in Program creation.
 * It extracts raw student/friend ID pairs without requiring a roster index.
 * 
 * For complex imports with column mapping, group preferences, avoid lists,
 * and meta fields, see importPreferences() in importPreferences.ts instead.
 */

export interface ParsedPreference {
	studentId: string;
	likeStudentIds: string[];
}

/**
 * Parse preferences from a pasted TSV/CSV string.
 * 
 * Expected format:
 * ```
 * student_id	friend 1 id	friend 2 id	friend 3 id
 * alice@school.edu	bob@school.edu	carol@school.edu	
 * bob@school.edu	alice@school.edu		
 * ```
 * 
 * @param pastedText - Raw TSV/CSV text
 * @returns Array of parsed preferences
 * @throws Error if the format is invalid
 */
export function parsePreferencesFromPaste(pastedText: string): ParsedPreference[] {
	const lines = pastedText.trim().split(/\r?\n/);
	
	if (lines.length === 0) {
		return [];
	}

	// Detect delimiter (tab or comma)
	const firstLine = lines[0];
	const delimiter = firstLine.includes('\t') ? '\t' : ',';

	// Parse header to detect column count
	const headerCells = firstLine.split(delimiter).map(cell => cell.trim().toLowerCase());
	
	// First column should be student ID
	const firstHeader = headerCells[0];
	const validFirstHeaders = ['student_id', 'student id', 'studentid', 'id', 'email'];
	const hasValidHeader = validFirstHeaders.some(h => firstHeader.includes(h));
	
	// Determine if first row is header or data
	const startRow = hasValidHeader ? 1 : 0;
	
	if (lines.length <= startRow) {
		return [];
	}

	const preferences: ParsedPreference[] = [];

	for (let i = startRow; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const cells = line.split(delimiter).map(cell => cell.trim());
		
		if (cells.length === 0 || !cells[0]) {
			continue; // Skip empty rows
		}

		const studentId = cells[0];
		const likeStudentIds: string[] = [];

		// Remaining cells are friend preferences
		for (let j = 1; j < cells.length; j++) {
			const friendId = cells[j];
			if (friendId && friendId !== studentId) {
				// Avoid duplicates while preserving order
				if (!likeStudentIds.includes(friendId)) {
					likeStudentIds.push(friendId);
				}
			}
		}

		preferences.push({
			studentId,
			likeStudentIds
		});
	}

	return preferences;
}

/**
 * Validate that all student IDs in preferences exist in the pool.
 * Returns warnings for any IDs that don't match.
 */
export function validatePreferencesAgainstPool(
	preferences: ParsedPreference[],
	poolMemberIds: string[]
): { validPreferences: ParsedPreference[]; warnings: string[] } {
	const memberSet = new Set(poolMemberIds);
	const warnings: string[] = [];
	const validPreferences: ParsedPreference[] = [];

	for (const pref of preferences) {
		// Check if student is in pool
		if (!memberSet.has(pref.studentId)) {
			warnings.push(`Student "${pref.studentId}" is not in the Pool (skipped)`);
			continue;
		}

		// Filter friend IDs to only those in pool
		const validFriendIds: string[] = [];
		for (const friendId of pref.likeStudentIds) {
			if (memberSet.has(friendId)) {
				validFriendIds.push(friendId);
			} else {
				warnings.push(`Friend "${friendId}" for "${pref.studentId}" not in Pool (ignored)`);
			}
		}

		validPreferences.push({
			studentId: pref.studentId,
			likeStudentIds: validFriendIds
		});
	}

	return { validPreferences, warnings };
}