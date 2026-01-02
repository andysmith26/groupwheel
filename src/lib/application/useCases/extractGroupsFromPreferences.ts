/**
 * extractGroupsFromPreferences use case.
 *
 * Extracts unique group names from imported preference data.
 * Can work with either raw sheet data (with choice column mappings)
 * or with already-imported Preference entities.
 *
 * @module application/useCases/extractGroupsFromPreferences
 */

import type { PreferenceRepository } from '$lib/application/ports';
import type { RawSheetData, ColumnMapping, MappedField } from '$lib/domain/import';
import { isStudentPreference } from '$lib/domain/preference';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';
import {
	detectMatrixFormat,
	extractGroupsFromMatrix,
	parseAllMatrixPreferences,
	type MatrixPreferenceColumn,
	type MatrixFormatDetection
} from '$lib/utils/matrixPreferenceParser';

// Re-export types for consumers
export type { MatrixPreferenceColumn, MatrixFormatDetection };

// =============================================================================
// Input Types
// =============================================================================

/**
 * Extract from raw sheet data with mappings (standard Shape B format).
 * Each column contains a group name, mapped to choice1, choice2, etc.
 */
export interface ExtractFromSheetInput {
	type: 'sheet';
	rawData: RawSheetData;
	columnMappings: ColumnMapping[];
}

/**
 * Extract from matrix format sheet data (Google Forms grid format).
 * Each column header contains a group name like "[Chorus]",
 * and cell values indicate rank like "1st Choice", "2nd Choice".
 */
export interface ExtractFromMatrixInput {
	type: 'matrix';
	rawData: RawSheetData;
	/** Optional: pre-detected columns. If not provided, auto-detection will run. */
	matrixColumns?: MatrixPreferenceColumn[];
}

/**
 * Extract from existing preferences in a program.
 */
export interface ExtractFromProgramInput {
	type: 'program';
	programId: string;
}

export type ExtractGroupsFromPreferencesInput =
	| ExtractFromSheetInput
	| ExtractFromMatrixInput
	| ExtractFromProgramInput;

// =============================================================================
// Output Types
// =============================================================================

export interface ExtractedGroup {
	/** The group name */
	name: string;
	/** Number of students who selected this group in any position */
	selectionCount: number;
	/** Positions this group was selected in (1-5) */
	positions: number[];
}

export interface ExtractGroupsFromPreferencesResult {
	/** Extracted groups sorted by selection count (descending) */
	groups: ExtractedGroup[];
	/** Total number of unique groups found */
	totalGroups: number;
	/** Total number of preferences analyzed */
	totalPreferences: number;
}

// =============================================================================
// Error Types
// =============================================================================

export type ExtractGroupsFromPreferencesError =
	| { type: 'NO_CHOICE_MAPPINGS'; message: string }
	| { type: 'NO_MATRIX_COLUMNS'; message: string }
	| { type: 'PROGRAM_NOT_FOUND'; message: string }
	| { type: 'NO_PREFERENCES'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ExtractGroupsFromPreferencesDeps {
	preferenceRepo?: PreferenceRepository;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Extract unique group names from preference data.
 */
export async function extractGroupsFromPreferences(
	deps: ExtractGroupsFromPreferencesDeps,
	input: ExtractGroupsFromPreferencesInput
): Promise<Result<ExtractGroupsFromPreferencesResult, ExtractGroupsFromPreferencesError>> {
	switch (input.type) {
		case 'sheet':
			return extractFromSheet(input);
		case 'matrix':
			return extractFromMatrix(input);
		case 'program':
			return extractFromProgram(deps, input);
	}
}

/**
 * Extract from raw sheet data with column mappings.
 */
function extractFromSheet(
	input: ExtractFromSheetInput
): Result<ExtractGroupsFromPreferencesResult, ExtractGroupsFromPreferencesError> {
	const { rawData, columnMappings } = input;

	// Build mapping from choice field to column index
	const choiceFields: MappedField[] = ['choice1', 'choice2', 'choice3', 'choice4', 'choice5'];
	const choiceColumnMap = new Map<number, number>(); // choice rank -> column index

	for (const mapping of columnMappings) {
		if (mapping.mappedTo && choiceFields.includes(mapping.mappedTo)) {
			const rank = parseInt(mapping.mappedTo.replace('choice', ''));
			choiceColumnMap.set(rank, mapping.columnIndex);
		}
	}

	if (choiceColumnMap.size === 0) {
		return err({
			type: 'NO_CHOICE_MAPPINGS',
			message: 'No choice columns are mapped. Please map at least one choice column.'
		});
	}

	// Extract all unique group names with counts
	const groupStats = new Map<string, { count: number; positions: Set<number> }>();

	for (const row of rawData.rows) {
		for (const [rank, columnIndex] of choiceColumnMap) {
			const value = row.cells[columnIndex]?.trim();
			if (value) {
				const existing = groupStats.get(value);
				if (existing) {
					existing.count++;
					existing.positions.add(rank);
				} else {
					groupStats.set(value, { count: 1, positions: new Set([rank]) });
				}
			}
		}
	}

	// Convert to result format
	const groups: ExtractedGroup[] = Array.from(groupStats.entries())
		.map(([name, stats]) => ({
			name,
			selectionCount: stats.count,
			positions: Array.from(stats.positions).sort((a, b) => a - b)
		}))
		.sort((a, b) => b.selectionCount - a.selectionCount);

	return ok({
		groups,
		totalGroups: groups.length,
		totalPreferences: rawData.rows.length
	});
}

/**
 * Extract from matrix format sheet data.
 *
 * Matrix format has column headers containing group names (e.g., "[Chorus]")
 * and cell values containing rank indicators (e.g., "1st Choice", "2nd Choice").
 */
function extractFromMatrix(
	input: ExtractFromMatrixInput
): Result<ExtractGroupsFromPreferencesResult, ExtractGroupsFromPreferencesError> {
	const { rawData, matrixColumns } = input;

	// Use provided columns or auto-detect
	let columns = matrixColumns;
	if (!columns || columns.length === 0) {
		const detection = detectMatrixFormat(rawData);
		if (!detection.isMatrixFormat || detection.columns.length === 0) {
			return err({
				type: 'NO_MATRIX_COLUMNS',
				message:
					'Could not detect matrix format columns. Expected headers with group names like "[Chorus]" or "Question: Group Name".'
			});
		}
		columns = detection.columns;
	}

	// Extract all unique groups from columns
	const allGroups = extractGroupsFromMatrix(rawData, columns);

	// Parse preferences to get selection counts
	const preferences = parseAllMatrixPreferences(rawData, columns);

	// Count selections per group with position tracking
	const groupStats = new Map<string, { count: number; positions: Set<number> }>();

	// Initialize all groups (some may have 0 selections)
	for (const groupName of allGroups) {
		groupStats.set(groupName, { count: 0, positions: new Set() });
	}

	// Count actual selections
	for (const pref of preferences) {
		for (const [groupName, rank] of pref.choiceMap) {
			const existing = groupStats.get(groupName);
			if (existing) {
				existing.count++;
				existing.positions.add(rank);
			}
		}
	}

	// Convert to result format
	const groups: ExtractedGroup[] = Array.from(groupStats.entries())
		.map(([name, stats]) => ({
			name,
			selectionCount: stats.count,
			positions: Array.from(stats.positions).sort((a, b) => a - b)
		}))
		.sort((a, b) => b.selectionCount - a.selectionCount);

	return ok({
		groups,
		totalGroups: groups.length,
		totalPreferences: rawData.rows.length
	});
}

/**
 * Extract from existing preferences in a program.
 */
async function extractFromProgram(
	deps: ExtractGroupsFromPreferencesDeps,
	input: ExtractFromProgramInput
): Promise<Result<ExtractGroupsFromPreferencesResult, ExtractGroupsFromPreferencesError>> {
	const { preferenceRepo } = deps;
	const { programId } = input;

	if (!preferenceRepo) {
		return err({
			type: 'NO_PREFERENCES',
			message: 'Preference repository is not available'
		});
	}

	const preferences = await preferenceRepo.listByProgramId(programId);

	if (preferences.length === 0) {
		return err({
			type: 'NO_PREFERENCES',
			message: 'No preferences found for this program'
		});
	}

	// Extract unique group IDs with counts
	// Note: These are group IDs, not names. In a full implementation,
	// you'd want to resolve these to group names.
	const groupStats = new Map<string, { count: number; positions: Set<number> }>();

	for (const pref of preferences) {
		if (!isStudentPreference(pref.payload)) continue;

		const likeGroupIds = pref.payload.likeGroupIds;
		for (let i = 0; i < likeGroupIds.length; i++) {
			const groupId = likeGroupIds[i];
			const position = i + 1;
			const existing = groupStats.get(groupId);
			if (existing) {
				existing.count++;
				existing.positions.add(position);
			} else {
				groupStats.set(groupId, { count: 1, positions: new Set([position]) });
			}
		}
	}

	const groups: ExtractedGroup[] = Array.from(groupStats.entries())
		.map(([name, stats]) => ({
			name,
			selectionCount: stats.count,
			positions: Array.from(stats.positions).sort((a, b) => a - b)
		}))
		.sort((a, b) => b.selectionCount - a.selectionCount);

	return ok({
		groups,
		totalGroups: groups.length,
		totalPreferences: preferences.length
	});
}

// =============================================================================
// Format Detection Helper
// =============================================================================

/**
 * Detected preference format type.
 */
export type PreferenceFormatType = 'matrix' | 'standard' | 'unknown';

/**
 * Result of auto-detecting preference format in sheet data.
 */
export interface PreferenceFormatDetection {
	/** The detected format type */
	format: PreferenceFormatType;
	/** Confidence score 0-1 */
	confidence: number;
	/** Human-readable description of what was detected */
	description: string;
	/** For matrix format: the detected columns */
	matrixColumns?: MatrixPreferenceColumn[];
	/** For matrix format: the common question prefix */
	matrixHeaderPattern?: string | null;
	/** Preview of extracted group names */
	previewGroups: string[];
}

/**
 * Auto-detect the preference format in sheet data.
 *
 * This helps teachers confirm how their data should be interpreted.
 * It detects:
 * - Matrix format: Column headers contain group names, cells contain ranks
 * - Standard format: Cells contain group names, columns represent rank positions
 *
 * @param rawData - The raw sheet data to analyze
 * @param columnMappings - Optional column mappings (for standard format detection)
 * @returns Detection result with format type and preview
 */
export function detectPreferenceFormat(
	rawData: RawSheetData,
	columnMappings?: ColumnMapping[]
): PreferenceFormatDetection {
	// Try matrix format detection
	const matrixDetection = detectMatrixFormat(rawData);

	if (matrixDetection.isMatrixFormat && matrixDetection.confidence >= 0.5) {
		const previewGroups = matrixDetection.columns.slice(0, 5).map((c) => c.groupName);
		const moreCount = matrixDetection.columns.length - 5;

		return {
			format: 'matrix',
			confidence: matrixDetection.confidence,
			description: `Matrix format detected: ${matrixDetection.columns.length} options with rank values in cells${matrixDetection.headerPattern ? ` (pattern: "${matrixDetection.headerPattern}...")` : ''}`,
			matrixColumns: matrixDetection.columns,
			matrixHeaderPattern: matrixDetection.headerPattern,
			previewGroups: moreCount > 0 ? [...previewGroups, `+${moreCount} more`] : previewGroups
		};
	}

	// Try standard format detection (if mappings provided)
	if (columnMappings && columnMappings.length > 0) {
		const choiceFields: MappedField[] = ['choice1', 'choice2', 'choice3', 'choice4', 'choice5'];
		const choiceMappings = columnMappings.filter(
			(m) => m.mappedTo && choiceFields.includes(m.mappedTo)
		);

		if (choiceMappings.length > 0) {
			// Sample some group names from the data
			const previewGroups = new Set<string>();
			for (const row of rawData.rows.slice(0, 5)) {
				for (const mapping of choiceMappings) {
					const value = row.cells[mapping.columnIndex]?.trim();
					if (value && previewGroups.size < 5) {
						previewGroups.add(value);
					}
				}
			}

			return {
				format: 'standard',
				confidence: 0.8,
				description: `Standard format: ${choiceMappings.length} choice columns mapped`,
				previewGroups: Array.from(previewGroups)
			};
		}
	}

	// Check if data might be standard format (cells look like group names, not ranks)
	const sampleValues: string[] = [];
	for (const row of rawData.rows.slice(0, 3)) {
		for (const cell of row.cells.slice(0, 5)) {
			if (cell?.trim()) {
				sampleValues.push(cell.trim());
			}
		}
	}

	// If most values don't look like ranks, might be standard format
	const nonRankValues = sampleValues.filter((v) => {
		const lowerV = v.toLowerCase();
		return (
			!lowerV.includes('choice') && !lowerV.includes('rank') && !/^\d+(st|nd|rd|th)?$/.test(v)
		);
	});

	if (nonRankValues.length > sampleValues.length * 0.7) {
		return {
			format: 'standard',
			confidence: 0.4,
			description: 'Data may be in standard format (map columns to choice1, choice2, etc.)',
			previewGroups: nonRankValues.slice(0, 5)
		};
	}

	return {
		format: 'unknown',
		confidence: 0,
		description: 'Could not detect preference format. Please map columns manually.',
		previewGroups: []
	};
}
