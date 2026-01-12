/**
 * importActivity use case.
 *
 * Imports an activity from a previously exported JSON file.
 * Creates all necessary entities: Students, Pool, Program, Preferences,
 * and optionally a Scenario with groups.
 *
 * @module application/useCases/importActivity
 */

import type {
	PoolRepository,
	StudentRepository,
	ProgramRepository,
	PreferenceRepository,
	ScenarioRepository,
	IdGenerator,
	Clock
} from '$lib/application/ports';
import type { Pool, Program, Student, Scenario } from '$lib/domain';
import type { Preference, StudentPreference } from '$lib/domain/preference';
import type { Group } from '$lib/domain/group';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';
import type { ActivityExportData } from '$lib/utils/activityFile';
import { ensureUniqueGroupName } from '$lib/utils/ensureUniqueGroupNames';

// =============================================================================
// Input/Output Types
// =============================================================================

export interface ImportActivityInput {
	/** The validated export data to import */
	exportData: ActivityExportData;

	/** Owner staff ID for the imported activity */
	ownerStaffId: string;

	/** ID of the authenticated user (for multi-tenant data isolation) */
	userId?: string;

	/** Whether to import the scenario (groups). Default: true if scenario exists */
	importScenario?: boolean;
}

export interface ImportActivityResult {
	program: Program;
	pool: Pool;
	scenario: Scenario | null;
	studentsImported: number;
	preferencesImported: number;
	groupsImported: number;
}

export type ImportActivityError =
	| { type: 'NO_STUDENTS'; message: string }
	| { type: 'SAVE_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ImportActivityDeps {
	poolRepo: PoolRepository;
	studentRepo: StudentRepository;
	programRepo: ProgramRepository;
	preferenceRepo: PreferenceRepository;
	scenarioRepo: ScenarioRepository;
	idGenerator: IdGenerator;
	clock: Clock;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

export async function importActivity(
	deps: ImportActivityDeps,
	input: ImportActivityInput
): Promise<Result<ImportActivityResult, ImportActivityError>> {
	const { ownerStaffId, userId, importScenario = true } = input;

	// Deep clone exportData to strip any Svelte proxies that IndexedDB can't serialize
	const exportData: ActivityExportData = JSON.parse(JSON.stringify(input.exportData));

	try {
		// -------------------------------------------------------------------------
		// Step 1: Validate we have students
		// -------------------------------------------------------------------------

		if (exportData.roster.students.length === 0) {
			return err({
				type: 'NO_STUDENTS',
				message: 'The imported file contains no students.'
			});
		}

		// -------------------------------------------------------------------------
		// Step 2: Create ID mappings for students and groups
		// -------------------------------------------------------------------------

		// Map old student IDs to new IDs (to avoid conflicts with existing data)
		const studentIdMap = new Map<string, string>();
		const groupIdMap = new Map<string, string>();

		for (const exportedStudent of exportData.roster.students) {
			const newId = deps.idGenerator.generateId();
			studentIdMap.set(exportedStudent.id, newId);
		}

		if (exportData.scenario?.groups) {
			for (const exportedGroup of exportData.scenario.groups) {
				if (!groupIdMap.has(exportedGroup.id)) {
					const newId = deps.idGenerator.generateId();
					groupIdMap.set(exportedGroup.id, newId);
				}
			}
		}

		// -------------------------------------------------------------------------
		// Step 3: Create Students
		// Note: We explicitly copy properties to avoid Svelte proxy issues with IndexedDB
		// -------------------------------------------------------------------------

		const students: Student[] = exportData.roster.students.map((s) => ({
			id: studentIdMap.get(s.id)!,
			firstName: String(s.firstName),
			lastName: s.lastName ? String(s.lastName) : undefined,
			gradeLevel: s.gradeLevel ? String(s.gradeLevel) : undefined,
			gender: s.gender ? String(s.gender) : undefined,
			meta: s.meta ? JSON.parse(JSON.stringify(s.meta)) : undefined
		}));

		await deps.studentRepo.saveMany(students);

		// -------------------------------------------------------------------------
		// Step 4: Create Pool
		// -------------------------------------------------------------------------

		const poolId = deps.idGenerator.generateId();
		const pool: Pool = {
			id: poolId,
			name: `${exportData.activity.name} Roster`,
			type: 'CLASS' as const,
			memberIds: students.map((s) => s.id),
			status: 'ACTIVE' as const,
			primaryStaffOwnerId: ownerStaffId,
			source: 'IMPORT' as const,
			userId
		};

		await deps.poolRepo.save(pool);

		// -------------------------------------------------------------------------
		// Step 5: Create Program
		// -------------------------------------------------------------------------

		const programId = deps.idGenerator.generateId();
		const program: Program = {
			id: programId,
			name: exportData.activity.name,
			type: exportData.activity.type,
			timeSpan: { termLabel: new Date().toISOString() },
			poolIds: [pool.id],
			primaryPoolId: pool.id,
			ownerStaffIds: [ownerStaffId],
			userId
		};

		await deps.programRepo.save(program);

		// -------------------------------------------------------------------------
		// Step 6: Create Preferences (with remapped student IDs)
		// -------------------------------------------------------------------------

		let preferencesImported = 0;

		if (exportData.preferences.length > 0) {
			const preferencesToSave: Preference[] = [];

			for (const exportedPref of exportData.preferences) {
				const newStudentId = studentIdMap.get(exportedPref.studentId);
				if (!newStudentId) {
					// Skip preferences for students not in roster
					continue;
				}

				// Copy arrays to plain arrays to avoid proxy issues with IndexedDB
				const preference: Preference = {
					id: deps.idGenerator.generateId(),
					programId: program.id,
					studentId: newStudentId,
					payload: {
						studentId: newStudentId,
						likeGroupIds: [...exportedPref.likeGroupIds],
						avoidStudentIds: [...exportedPref.avoidStudentIds]
							.map((oldId) => studentIdMap.get(oldId))
							.filter((id): id is string => id !== undefined),
						avoidGroupIds: [...exportedPref.avoidGroupIds]
					} satisfies StudentPreference
				};

				preferencesToSave.push(preference);
				preferencesImported++;
			}

			if (preferencesToSave.length > 0) {
				if (typeof deps.preferenceRepo.setForProgram === 'function') {
					await deps.preferenceRepo.setForProgram(program.id, preferencesToSave);
				} else {
					for (const pref of preferencesToSave) {
						await deps.preferenceRepo.save(pref);
					}
				}
			}
		}

		// -------------------------------------------------------------------------
		// Step 7: Create Scenario with Groups (if present and requested)
		// -------------------------------------------------------------------------

		let scenario: Scenario | null = null;
		let groupsImported = 0;

		if (importScenario && exportData.scenario?.groups && exportData.scenario.groups.length > 0) {
			const now = deps.clock.now();
			const usedGroupNames = new Set<string>();

			// Remap group member IDs to new student IDs
			// Copy to plain arrays to avoid proxy issues with IndexedDB
			const seenGroupIds = new Set<string>();
			const groups: Group[] = exportData.scenario.groups.map((g) => {
				const isDuplicate = seenGroupIds.has(g.id);
				if (!isDuplicate) {
					seenGroupIds.add(g.id);
				}

				return {
					id: isDuplicate ? deps.idGenerator.generateId() : groupIdMap.get(g.id) ?? deps.idGenerator.generateId(),
					name: ensureUniqueGroupName(String(g.name ?? ''), usedGroupNames),
					capacity: g.capacity,
					memberIds: [...g.memberIds]
						.map((oldId) => studentIdMap.get(oldId))
						.filter((id): id is string => id !== undefined)
				};
			});

			groupsImported = groups.length;

			// Deep copy algorithmConfig to avoid proxy issues
			const algorithmConfig = exportData.scenario.algorithmConfig
				? JSON.parse(JSON.stringify(exportData.scenario.algorithmConfig))
				: undefined;

			scenario = {
				id: deps.idGenerator.generateId(),
				programId: program.id,
				status: 'DRAFT' as const,
				groups,
				participantSnapshot: [...students.map((s) => s.id)],
				createdAt: now,
				lastModifiedAt: now,
				algorithmConfig
			};

			await deps.scenarioRepo.save(scenario);
		}

		// -------------------------------------------------------------------------
		// Return Result
		// -------------------------------------------------------------------------

		return ok({
			program,
			pool,
			scenario,
			studentsImported: students.length,
			preferencesImported,
			groupsImported
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error during import';
		return err({ type: 'INTERNAL_ERROR', message });
	}
}
