/**
 * createGroupingActivity.ts
 *
 * Orchestration service for the unified "Create Groups" wizard.
 * Creates a Pool, Program, and Preferences in a single operation.
 *
 * This service exists because the UI presents a unified "grouping activity"
 * concept while the domain model correctly separates Pool (roster) from
 * Program (activity) from Preferences (student input). See decision record:
 * docs/decisions/2025-12-01-unified-create-groups-wizard.md
 *
 * ARCHITECTURE NOTE: This service calls use cases via the appEnvUseCases facade,
 * NOT domain factories directly. Business logic and validation live in use cases.
 */

import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import type { Pool, Program } from '$lib/domain';
import type { StudentPreference } from '$lib/domain/preference';
import type { Result } from '$lib/types/result';
import { ok, err, isErr } from '$lib/types/result';
import { importRoster, createProgram } from '$lib/services/appEnvUseCases';
import type { ImportRosterInput } from '$lib/application/useCases/importRoster';
import type { CreateProgramInput } from '$lib/application/useCases/createProgram';

// --- Input types ---

export interface ParsedStudent {
	id: string;
	firstName: string;
	lastName: string;
	displayName: string;
	grade?: string;
	meta?: Record<string, string>;
}

export interface ParsedPreference {
	studentId: string;
	likeStudentIds: string[];
}

export interface CreateGroupingActivityInput {
	/** Name for the activity (e.g., "Lab Partners - Week 1") */
	activityName: string;

	/** Parsed students from roster paste */
	students: ParsedStudent[];

	/** Parsed preferences from preferences paste (optional) */
	preferences?: ParsedPreference[];

	/** If reusing an existing roster, the Pool ID */
	existingPoolId?: string;

	/** Owner staff ID (MVP placeholder) */
	ownerStaffId?: string;
}

// --- Output types ---

export interface CreateGroupingActivityResult {
	pool: Pool;
	program: Program;
	preferencesImported: number;
	preferencesSkipped: number;
	warnings: string[];
}

export type CreateGroupingActivityError =
	| { type: 'NO_STUDENTS'; message: string }
	| { type: 'POOL_CREATION_FAILED'; message: string }
	| { type: 'PROGRAM_CREATION_FAILED'; message: string }
	| { type: 'POOL_NOT_FOUND'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

// --- Main function ---

export async function createGroupingActivity(
	env: InMemoryEnvironment,
	input: CreateGroupingActivityInput
): Promise<Result<CreateGroupingActivityResult, CreateGroupingActivityError>> {
	const warnings: string[] = [];
	const ownerStaffId = input.ownerStaffId ?? 'owner-1';

	let pool: Pool;
	let studentIds: string[];

	// --- Step 1: Get or create Pool ---

	if (input.existingPoolId) {
		// Reusing existing roster
		const existingPool = await env.poolRepo.getById(input.existingPoolId);
		if (!existingPool) {
			return err({
				type: 'POOL_NOT_FOUND',
				message: `Could not find roster with ID ${input.existingPoolId}`
			});
		}
		pool = existingPool;
		studentIds = pool.memberIds;
	} else {
		// Creating new roster from pasted students via importRoster use case
		if (input.students.length === 0) {
			return err({
				type: 'NO_STUDENTS',
				message: 'No students provided. Please paste your roster data.'
			});
		}

		// Convert ParsedStudent[] to the TSV format expected by importRoster
		const headerRow = 'name\tid\tgrade';
		const dataRows = input.students.map((s) => {
			const grade = s.grade ?? '';
			return `${s.displayName}\t${s.id}\t${grade}`;
		});
		const pastedText = [headerRow, ...dataRows].join('\n');

		const importInput: ImportRosterInput = {
			pastedText,
			poolName: `${input.activityName} - Roster`,
			poolType: 'CLASS',
			ownerStaffId
		};

		const poolResult = await importRoster(env, importInput);

		if (isErr(poolResult)) {
			return err({
				type: 'POOL_CREATION_FAILED',
				message: `Failed to create roster: ${poolResult.error.type}`
			});
		}

		pool = poolResult.value;
		studentIds = pool.memberIds;
	}

	// --- Step 2: Create Program via createProgram use case ---

	const programInput: CreateProgramInput = {
		name: input.activityName,
		type: 'CLASS_ACTIVITY',
		timeSpan: {
			termLabel: new Date().toISOString().slice(0, 10) // Default to today's date
		},
		primaryPoolId: pool.id,
		ownerStaffIds: [ownerStaffId]
	};

	const programResult = await createProgram(env, programInput);

	if (isErr(programResult)) {
		return err({
			type: 'PROGRAM_CREATION_FAILED',
			message: `Failed to create activity: ${programResult.error.type}`
		});
	}

	const program = programResult.value;

	// --- Step 3: Save Preferences (if provided) ---
	// Note: PreferenceRepository.setForProgram is not in the port interface,
	// so we use the concrete implementation. This is acceptable for MVP
	// since preferences don't have a dedicated use case yet.

	let preferencesImported = 0;
	let preferencesSkipped = 0;

	if (input.preferences && input.preferences.length > 0) {
		const studentIdSet = new Set(studentIds.map((id) => id.toLowerCase()));

		const validPreferences: StudentPreference[] = [];

		for (const pref of input.preferences) {
			const normalizedStudentId = pref.studentId.toLowerCase();

			// Validate student is in roster
			if (!studentIdSet.has(normalizedStudentId)) {
				warnings.push(`${pref.studentId}: not in roster, skipped`);
				preferencesSkipped++;
				continue;
			}

			// Filter out any liked students not in roster
			const validLikeIds: string[] = [];
			for (const likeId of pref.likeStudentIds) {
				const normalizedLikeId = likeId.toLowerCase();
				if (studentIdSet.has(normalizedLikeId)) {
					validLikeIds.push(normalizedLikeId);
				} else {
					warnings.push(`${pref.studentId}: listed "${likeId}" who is not in roster`);
				}
			}

			// Create preference entity
			validPreferences.push({
				studentId: normalizedStudentId,
				likeStudentIds: validLikeIds,
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: [],
				meta: {}
			});

			preferencesImported++;
		}

		// Save all preferences at once using concrete repo method
		// This is a known deviation from pure port usage - acceptable for MVP
		if (validPreferences.length > 0) {
			const prefRepo = env.preferenceRepo as unknown as {
				setForProgram: (programId: string, prefs: StudentPreference[]) => Promise<void>;
			};
			await prefRepo.setForProgram(program.id, validPreferences);
		}
	}

	return ok({
		pool,
		program,
		preferencesImported,
		preferencesSkipped,
		warnings
	});
}
