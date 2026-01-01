/**
 * importRosterWithMapping use case.
 *
 * Takes raw sheet data and column mappings, validates the data,
 * and creates Students and a Pool. Optionally creates StudentPreferences
 * if choice columns are mapped.
 *
 * This use case is designed for importing from external sources (like Google Sheets)
 * where the column structure is user-defined and needs explicit mapping.
 *
 * @module application/useCases/importRosterWithMapping
 */

import type {
	PoolRepository,
	StudentRepository,
	PreferenceRepository,
	IdGenerator
} from '$lib/application/ports';
import type { Pool, PoolType, Student } from '$lib/domain';
import type { Preference, StudentPreference } from '$lib/domain/preference';
import type {
	RawSheetData,
	ColumnMapping,
	ImportValidationResult,
	MappedField
} from '$lib/domain/import';
import {
	hasRequiredMappings,
	getMissingRequiredFields,
	hasDuplicateMappings,
	validateMappedData,
	generateStudentId
} from '$lib/domain/import';
import { createPool } from '$lib/domain/pool';
import { createStudent } from '$lib/domain/student';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

// =============================================================================
// Input Types
// =============================================================================

export interface ImportRosterWithMappingInput {
	/** Raw sheet data from Google Sheets or other source */
	rawData: RawSheetData;
	/** Column mappings configured by user */
	columnMappings: ColumnMapping[];
	/** Name for the new pool/roster */
	poolName: string;
	/** Type of pool */
	poolType: PoolType;
	/** Staff owner ID */
	ownerStaffId: string;
	/** Optional school ID */
	schoolId?: string;
	/** Optional program ID to attach preferences to */
	programId?: string;
	/** Optional user ID for multi-tenant isolation */
	userId?: string;
	/** Optional list of valid group names for preference validation */
	validGroupNames?: string[];
}

// =============================================================================
// Output Types
// =============================================================================

export interface ImportRosterWithMappingResult {
	/** The created pool */
	pool: Pool;
	/** Number of students successfully imported */
	studentsImported: number;
	/** Number of preferences created (if programId provided) */
	preferencesImported: number;
	/** Warnings generated during import */
	warnings: string[];
	/** The created students (for reference) */
	students: Student[];
}

// =============================================================================
// Error Types
// =============================================================================

export type ImportRosterWithMappingError =
	| { type: 'MISSING_REQUIRED_MAPPINGS'; missingFields: MappedField[] }
	| { type: 'DUPLICATE_MAPPINGS'; duplicateFields: MappedField[] }
	| { type: 'NO_VALID_ROWS'; validation: ImportValidationResult }
	| { type: 'VALIDATION_FAILED'; validation: ImportValidationResult }
	| { type: 'INTERNAL_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ImportRosterWithMappingDeps {
	poolRepo: PoolRepository;
	studentRepo: StudentRepository;
	preferenceRepo: PreferenceRepository;
	idGenerator: IdGenerator;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

/**
 * Import a roster from raw sheet data with user-defined column mappings.
 *
 * This use case:
 * 1. Validates that required columns are mapped
 * 2. Validates each row of data
 * 3. Creates Student entities
 * 4. Creates a Pool containing those students
 * 5. Optionally creates StudentPreferences if choice columns are mapped and programId is provided
 */
export async function importRosterWithMapping(
	deps: ImportRosterWithMappingDeps,
	input: ImportRosterWithMappingInput
): Promise<Result<ImportRosterWithMappingResult, ImportRosterWithMappingError>> {
	const warnings: string[] = [];

	// -------------------------------------------------------------------------
	// Step 1: Validate mappings
	// -------------------------------------------------------------------------

	// Check required fields are mapped
	if (!hasRequiredMappings(input.columnMappings)) {
		const missingFields = getMissingRequiredFields(input.columnMappings);
		return err({
			type: 'MISSING_REQUIRED_MAPPINGS',
			missingFields
		});
	}

	// Check for duplicate mappings
	const duplicates = hasDuplicateMappings(input.columnMappings);
	if (duplicates.length > 0) {
		return err({
			type: 'DUPLICATE_MAPPINGS',
			duplicateFields: duplicates
		});
	}

	// -------------------------------------------------------------------------
	// Step 2: Validate data
	// -------------------------------------------------------------------------

	const validation = validateMappedData(input.rawData, input.columnMappings);

	if (validation.validRows.length === 0) {
		return err({
			type: 'NO_VALID_ROWS',
			validation
		});
	}

	// Add warnings for invalid rows (but don't fail the import)
	for (const invalidRow of validation.invalidRows) {
		warnings.push(`Row ${invalidRow.rowIndex}: ${invalidRow.errors.join(', ')}`);
	}

	// -------------------------------------------------------------------------
	// Step 3: Create Students
	// -------------------------------------------------------------------------

	const students: Student[] = [];
	const studentIdMap = new Map<number, string>(); // rowIndex -> studentId

	// Check if we have any choice columns mapped
	const hasChoiceMappings = input.columnMappings.some(
		(m) => m.mappedTo && m.mappedTo.startsWith('choice')
	);

	// Build group name lookup for preference validation (case-insensitive)
	const groupNameMap = new Map<string, string>();
	if (input.validGroupNames) {
		for (const name of input.validGroupNames) {
			groupNameMap.set(name.toLowerCase().trim(), name);
		}
	}

	for (const row of validation.validRows) {
		if (!row.student) continue;

		// Generate a unique student ID
		const studentId = deps.idGenerator.generateId();
		studentIdMap.set(row.rowIndex, studentId);

		try {
			const student = createStudent({
				id: studentId,
				firstName: row.student.firstName,
				lastName: row.student.lastName,
				meta: {
					importRowIndex: row.rowIndex
				}
			});
			students.push(student);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Unknown error';
			warnings.push(`Row ${row.rowIndex}: Failed to create student - ${message}`);
		}
	}

	if (students.length === 0) {
		return err({
			type: 'NO_VALID_ROWS',
			validation
		});
	}

	// -------------------------------------------------------------------------
	// Step 4: Save Students
	// -------------------------------------------------------------------------

	try {
		await deps.studentRepo.saveMany(students);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		return err({
			type: 'INTERNAL_ERROR',
			message: `Failed to save students: ${message}`
		});
	}

	// -------------------------------------------------------------------------
	// Step 5: Create Pool
	// -------------------------------------------------------------------------

	let pool: Pool;
	try {
		const poolId = deps.idGenerator.generateId();
		pool = createPool({
			id: poolId,
			name: input.poolName,
			type: input.poolType,
			memberIds: students.map((s) => s.id),
			schoolId: input.schoolId,
			primaryStaffOwnerId: input.ownerStaffId,
			status: 'ACTIVE',
			source: 'IMPORT',
			userId: input.userId
		});

		await deps.poolRepo.save(pool);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		return err({
			type: 'INTERNAL_ERROR',
			message: `Failed to create pool: ${message}`
		});
	}

	// -------------------------------------------------------------------------
	// Step 6: Create Preferences (if choice columns mapped and programId provided)
	// -------------------------------------------------------------------------

	let preferencesImported = 0;

	if (hasChoiceMappings && input.programId) {
		const preferences: Preference[] = [];

		for (const row of validation.validRows) {
			const studentId = studentIdMap.get(row.rowIndex);
			if (!studentId || !row.choices || row.choices.length === 0) continue;

			// Validate and map group names if validGroupNames provided
			let likeGroupIds: string[] = [];
			if (input.validGroupNames && input.validGroupNames.length > 0) {
				for (const choice of row.choices) {
					const normalizedChoice = choice.toLowerCase().trim();
					const matchedGroup = groupNameMap.get(normalizedChoice);
					if (matchedGroup) {
						likeGroupIds.push(matchedGroup);
					} else {
						warnings.push(`Row ${row.rowIndex}: Unknown group "${choice}"`);
					}
				}
			} else {
				// No validation, use choices as-is
				likeGroupIds = row.choices;
			}

			if (likeGroupIds.length > 0) {
				const preference: Preference = {
					id: deps.idGenerator.generateId(),
					programId: input.programId,
					studentId: studentId,
					payload: {
						studentId: studentId,
						avoidStudentIds: [],
						likeGroupIds: likeGroupIds,
						avoidGroupIds: []
					} satisfies StudentPreference
				};
				preferences.push(preference);
				preferencesImported++;
			}
		}

		// Save preferences
		if (preferences.length > 0) {
			try {
				if (typeof deps.preferenceRepo.setForProgram === 'function') {
					await deps.preferenceRepo.setForProgram(input.programId, preferences);
				} else {
					for (const pref of preferences) {
						await deps.preferenceRepo.save(pref);
					}
				}
			} catch (e) {
				const message = e instanceof Error ? e.message : 'Unknown error';
				warnings.push(`Failed to save some preferences: ${message}`);
			}
		}
	}

	// -------------------------------------------------------------------------
	// Return Result
	// -------------------------------------------------------------------------

	return ok({
		pool,
		studentsImported: students.length,
		preferencesImported,
		warnings,
		students
	});
}
