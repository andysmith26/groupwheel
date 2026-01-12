/**
 * Wizard Sheet Detector utilities.
 *
 * Provides auto-detection of roster and responses tabs in a Google Sheet,
 * plus extraction of group names from response choices.
 *
 * Reuses patterns from responseTracker.ts for consistent detection.
 *
 * @module utils/wizardSheetDetector
 */

import type { RawSheetData } from '$lib/domain/import';
import type { SheetTab } from '$lib/domain/sheetConnection';
import { extractChoices } from './responseTracker';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of auto-detecting tabs in a spreadsheet.
 */
export interface TabDetectionResult {
	/** The detected roster tab, if found */
	rosterTab: SheetTab | null;
	/** The detected responses tab, if found */
	responsesTab: SheetTab | null;
	/** Whether both tabs were successfully detected */
	success: boolean;
	/** Human-readable message about what was detected */
	message: string;
}

/**
 * Extracted group information from responses.
 */
export interface ExtractedGroupInfo {
	/** Group name */
	name: string;
	/** Number of times this group was selected (any rank) */
	requestCount: number;
	/** Number of first-choice selections */
	firstChoiceCount: number;
}

// =============================================================================
// Tab Detection
// =============================================================================

/**
 * Detect if headers look like a roster (name + email columns, no timestamp).
 *
 * Rosters typically have:
 * - Name column (first name, last name, or full name)
 * - Email column
 * - No Timestamp column (Google Forms adds this)
 */
export function looksLikeRoster(headers: string[]): boolean {
	const lowerHeaders = headers.map(h => h.toLowerCase().trim());

	// Check for name-like columns
	const hasName = lowerHeaders.some(h =>
		h.includes('name') || h.includes('student') || h === 'first' || h === 'last'
	);

	// Check for email column
	const hasEmail = lowerHeaders.some(h =>
		h.includes('email') || h.includes('e-mail')
	);

	// Roster typically doesn't have Timestamp column (Google Forms adds this)
	const hasTimestamp = lowerHeaders.some(h => h.includes('timestamp'));

	return hasName && hasEmail && !hasTimestamp;
}

/**
 * Detect if headers look like Google Form responses.
 *
 * Form responses typically have:
 * - Timestamp column (Google Forms always adds this)
 * - Email column (when "Collect email addresses" is enabled)
 * - Choice columns (from form questions)
 */
export function looksLikeResponses(headers: string[]): boolean {
	const lowerHeaders = headers.map(h => h.toLowerCase().trim());

	// Google Forms always adds a Timestamp column
	const hasTimestamp = lowerHeaders.some(h => h.includes('timestamp'));

	// Also check for email (Google Forms can collect email)
	const hasEmail = lowerHeaders.some(h =>
		h.includes('email') || h.includes('e-mail')
	);

	// Responses often have choice-related columns or matrix format
	const hasChoiceIndicators = lowerHeaders.some(h =>
		h.includes('choice') ||
		h.includes('[') ||  // matrix questions have [option] format
		h.includes('1st') ||
		h.includes('2nd') ||
		h.includes('rank')
	);

	return hasTimestamp && (hasEmail || hasChoiceIndicators);
}

/**
 * Score how likely a tab is to be a roster (higher = more likely).
 */
function scoreAsRoster(headers: string[]): number {
	const lowerHeaders = headers.map(h => h.toLowerCase().trim());
	let score = 0;

	// Positive signals
	if (lowerHeaders.some(h => h.includes('name'))) score += 2;
	if (lowerHeaders.some(h => h.includes('email'))) score += 2;
	if (lowerHeaders.some(h => h.includes('student'))) score += 1;
	if (lowerHeaders.some(h => h === 'first' || h === 'first name')) score += 1;
	if (lowerHeaders.some(h => h === 'last' || h === 'last name')) score += 1;
	if (lowerHeaders.some(h => h.includes('grade') || h.includes('class'))) score += 1;

	// Negative signals (form responses)
	if (lowerHeaders.some(h => h.includes('timestamp'))) score -= 5;
	if (lowerHeaders.some(h => h.includes('choice'))) score -= 2;
	if (lowerHeaders.some(h => h.includes('['))) score -= 2;

	return score;
}

/**
 * Score how likely a tab is to be form responses (higher = more likely).
 */
function scoreAsResponses(headers: string[]): number {
	const lowerHeaders = headers.map(h => h.toLowerCase().trim());
	let score = 0;

	// Positive signals
	if (lowerHeaders.some(h => h.includes('timestamp'))) score += 5;
	if (lowerHeaders.some(h => h.includes('choice'))) score += 2;
	if (lowerHeaders.some(h => h.includes('['))) score += 3; // Matrix format
	if (lowerHeaders.some(h => h.includes('1st') || h.includes('2nd'))) score += 2;
	if (lowerHeaders.some(h => h.includes('rank'))) score += 2;

	// Email is common in both, slight positive for responses
	if (lowerHeaders.some(h => h.includes('email'))) score += 1;

	// Negative signals (roster-like)
	if (lowerHeaders.some(h => h === 'name' || h === 'student name')) score -= 1;
	if (lowerHeaders.some(h => h === 'grade')) score -= 1;

	return score;
}

/**
 * Auto-detect which tabs are the roster and responses based on headers.
 *
 * @param tabs - Available sheet tabs
 * @param tabDataMap - Map of tab GID to loaded data
 * @returns Detection result with identified tabs
 */
export function detectTabs(
	tabs: SheetTab[],
	tabDataMap: Map<string, RawSheetData>
): TabDetectionResult {
	let bestRosterTab: SheetTab | null = null;
	let bestRosterScore = -Infinity;
	let bestResponsesTab: SheetTab | null = null;
	let bestResponsesScore = -Infinity;

	for (const tab of tabs) {
		const data = tabDataMap.get(tab.gid);
		if (!data || data.headers.length === 0) continue;

		const rosterScore = scoreAsRoster(data.headers);
		const responsesScore = scoreAsResponses(data.headers);

		// Track best roster candidate
		if (rosterScore > bestRosterScore && rosterScore > 0) {
			bestRosterScore = rosterScore;
			bestRosterTab = tab;
		}

		// Track best responses candidate
		if (responsesScore > bestResponsesScore && responsesScore > 0) {
			bestResponsesScore = responsesScore;
			bestResponsesTab = tab;
		}
	}

	// Build result message
	const parts: string[] = [];
	if (bestRosterTab) {
		parts.push(`Roster: "${bestRosterTab.title}"`);
	}
	if (bestResponsesTab) {
		parts.push(`Responses: "${bestResponsesTab.title}"`);
	}

	const success = bestRosterTab !== null;
	const message = parts.length > 0
		? `Detected ${parts.join(', ')}`
		: 'Could not auto-detect tabs. Please select manually.';

	return {
		rosterTab: bestRosterTab,
		responsesTab: bestResponsesTab,
		success,
		message
	};
}

// =============================================================================
// Group Extraction
// =============================================================================

/**
 * Extract unique group names from form responses data.
 *
 * Parses the choices from each response row and aggregates them
 * into a list of groups with request counts.
 *
 * @param responsesData - Raw sheet data from responses tab
 * @returns Array of extracted groups sorted by request count (descending)
 */
export function extractGroupsFromResponses(responsesData: RawSheetData): ExtractedGroupInfo[] {
	const groupStats = new Map<string, { requestCount: number; firstChoiceCount: number }>();

	for (const row of responsesData.rows) {
		const choices = extractChoices(row, responsesData.headers);

		for (let i = 0; i < choices.length; i++) {
			const groupName = choices[i].trim();
			if (!groupName) continue;

			const existing = groupStats.get(groupName);
			if (existing) {
				existing.requestCount++;
				if (i === 0) existing.firstChoiceCount++;
			} else {
				groupStats.set(groupName, {
					requestCount: 1,
					firstChoiceCount: i === 0 ? 1 : 0
				});
			}
		}
	}

	// Convert to array and sort by request count
	const groups: ExtractedGroupInfo[] = Array.from(groupStats.entries())
		.map(([name, stats]) => ({
			name,
			requestCount: stats.requestCount,
			firstChoiceCount: stats.firstChoiceCount
		}))
		.sort((a, b) => b.requestCount - a.requestCount);

	return groups;
}

/**
 * Extract just the group names (for pre-filling group shells).
 *
 * @param responsesData - Raw sheet data from responses tab
 * @returns Array of unique group names in order of popularity
 */
export function extractGroupNames(responsesData: RawSheetData): string[] {
	const groups = extractGroupsFromResponses(responsesData);
	return groups.map(g => g.name);
}
