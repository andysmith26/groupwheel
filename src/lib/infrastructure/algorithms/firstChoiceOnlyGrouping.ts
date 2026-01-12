import type {
	GroupingAlgorithm,
	StudentRepository,
	PreferenceRepository,
	IdGenerator
} from '$lib/application/ports';
import { assignFirstChoiceOnly } from '$lib/algorithms/first-choice-only';
import type { Student, Group, StudentPreference } from '$lib/domain';

/**
 * Configuration options for the first-choice-only grouping algorithm.
 */
export interface FirstChoiceOnlyGroupingConfig {
	/**
	 * Predefined groups to use. Required for this algorithm.
	 */
	groups?: Array<{ id?: string; name: string; capacity?: number | null }>;

	/**
	 * Random seed for shuffling student order before assignment.
	 * Different seeds produce different processing orders.
	 */
	seed?: number;
}

/**
 * Adapter that connects the first-choice-only algorithm to the GroupingAlgorithm port.
 *
 * This algorithm assigns every student to their first preference, ignoring capacity.
 * Students without preferences are left unassigned.
 *
 * Use this when you want to see what happens when everyone gets their first choice,
 * accepting that groups may be over-enrolled.
 */
export class FirstChoiceOnlyGroupingAlgorithm implements GroupingAlgorithm {
	constructor(
		private studentRepo: StudentRepository,
		private preferenceRepo: PreferenceRepository,
		private idGenerator: IdGenerator
	) {}

	async generateGroups(params: {
		programId: string;
		studentIds: string[];
		algorithmConfig?: unknown;
	}): Promise<
		| {
				success: true;
				groups: { id: string; name: string; capacity: number | null; memberIds: string[] }[];
		  }
		| { success: false; message: string }
	> {
		try {
			// Validate inputs
			if (!params.studentIds || params.studentIds.length === 0) {
				return { success: false, message: 'No students provided for grouping' };
			}

			// Parse algorithm config
			const config = (params.algorithmConfig as FirstChoiceOnlyGroupingConfig | undefined) ?? {};

			// This algorithm requires predefined groups
			if (!config.groups || config.groups.length === 0) {
				return {
					success: false,
					message: 'First Choice Only algorithm requires predefined groups'
				};
			}

			// Fetch students
			const students = await this.studentRepo.getByIds(params.studentIds);
			if (students.length === 0) {
				return { success: false, message: 'No students found in repository' };
			}

			// Create studentsById map
			const studentsById: Record<string, Student> = {};
			for (const student of students) {
				studentsById[student.id] = student;
			}

			// Fetch preferences for this program
			const preferences = await this.preferenceRepo.listByProgramId(params.programId);

			// Parse preference payloads and filter to only students in this grouping
			const preferencesById: Record<string, StudentPreference> = {};
			for (const pref of preferences) {
				if (params.studentIds.includes(pref.studentId)) {
					try {
						preferencesById[pref.studentId] = parsePreferencePayload(pref.payload, pref.studentId);
					} catch (error) {
						// If preference parsing fails, use empty preferences for this student
						console.warn(`Failed to parse preferences for student ${pref.studentId}:`, error);
						preferencesById[pref.studentId] = createEmptyPreference(pref.studentId);
					}
				}
			}

			// Ensure all students have a preference record (even if empty)
			for (const studentId of params.studentIds) {
				if (!preferencesById[studentId]) {
					preferencesById[studentId] = createEmptyPreference(studentId);
				}
			}

			// Convert config groups to domain Groups
			const groups: Group[] = config.groups.map((g) => ({
				id: g.id ?? this.idGenerator.generateId(),
				name: g.name,
				capacity: g.capacity ?? null,
				memberIds: []
			}));

			// Call first-choice-only assignment algorithm
			const result = assignFirstChoiceOnly({
				groups,
				studentOrder: params.studentIds,
				preferencesById,
				studentsById,
				seed: config.seed
			});

			// Note: We don't fail on unassigned students - this algorithm intentionally
			// leaves students without preferences unassigned
			return {
				success: true,
				groups: result.groups
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error during grouping';
			return { success: false, message };
		}
	}
}

/**
 * Parse a preference payload into a StudentPreference object.
 */
function parsePreferencePayload(payload: unknown, studentId: string): StudentPreference {
	if (!payload || typeof payload !== 'object') {
		return createEmptyPreference(studentId);
	}

	const pref = payload as Partial<StudentPreference>;

	return {
		studentId: pref.studentId ?? studentId,
		avoidStudentIds: Array.isArray(pref.avoidStudentIds) ? pref.avoidStudentIds : [],
		likeGroupIds: Array.isArray(pref.likeGroupIds) ? pref.likeGroupIds : [],
		avoidGroupIds: Array.isArray(pref.avoidGroupIds) ? pref.avoidGroupIds : [],
		meta: pref.meta
	};
}

/**
 * Create an empty preference record for a student with no preferences.
 */
function createEmptyPreference(studentId: string): StudentPreference {
	return {
		studentId,
		avoidStudentIds: [],
		likeGroupIds: [],
		avoidGroupIds: []
	};
}
