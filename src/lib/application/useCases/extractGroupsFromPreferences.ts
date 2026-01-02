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

// =============================================================================
// Input Types
// =============================================================================

/**
 * Extract from raw sheet data with mappings.
 */
export interface ExtractFromSheetInput {
	type: 'sheet';
	rawData: RawSheetData;
	columnMappings: ColumnMapping[];
}

/**
 * Extract from existing preferences in a program.
 */
export interface ExtractFromProgramInput {
	type: 'program';
	programId: string;
}

export type ExtractGroupsFromPreferencesInput = ExtractFromSheetInput | ExtractFromProgramInput;

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
	if (input.type === 'sheet') {
		return extractFromSheet(input);
	} else {
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
