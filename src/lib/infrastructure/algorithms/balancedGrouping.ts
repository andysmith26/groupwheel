import type { GroupingAlgorithm } from '$lib/application/useCases/generateScenario';
import type { StudentRepository, PreferenceRepository, IdGenerator } from '$lib/application/ports';
import { assignBalanced } from '$lib/algorithms/balanced-assignment';
import type { StudentPreference } from '$lib/types/preferences';
import type { Student, Group } from '$lib/types';

/**
 * Configuration options for the balanced grouping algorithm.
 */
export interface BalancedGroupingConfig {
	/**
	 * Predefined groups to use. If not provided, groups will be generated automatically.
	 */
	groups?: Array<{ id?: string; name: string; capacity?: number | null }>;

	/**
	 * Number of swap iterations for optimization (default: 300).
	 */
	swapBudget?: number;
}

/**
 * Adapter that connects the balanced assignment algorithm to the GroupingAlgorithm port.
 *
 * This adapter:
 * - Fetches student and preference data from repositories
 * - Generates default groups if none are provided (targeting 4-6 students per group)
 * - Converts domain types to algorithm inputs
 * - Runs the balanced assignment algorithm
 * - Maps results back to the expected format
 */
export class BalancedGroupingAlgorithm implements GroupingAlgorithm {
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
		| { success: true; groups: { id: string; name: string; capacity: number | null; memberIds: string[] }[] }
		| { success: false; message: string }
	> {
		try {
			// Validate inputs
			if (!params.studentIds || params.studentIds.length === 0) {
				return { success: false, message: 'No students provided for grouping' };
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

			// Parse algorithm config
			const config = (params.algorithmConfig as BalancedGroupingConfig | undefined) ?? {};

			// Generate or use provided groups
			let groups: Group[];
			if (config.groups && config.groups.length > 0) {
				// Use provided groups
				groups = config.groups.map((g) => ({
					id: g.id ?? this.idGenerator.generateId(),
					name: g.name,
					capacity: g.capacity ?? null,
					memberIds: []
				}));
			} else {
				// Generate default groups
				groups = this.generateDefaultGroups(params.studentIds.length);
			}

			// Call balanced assignment algorithm
			const result = assignBalanced({
				groups,
				studentOrder: params.studentIds,
				preferencesById,
				studentsById,
				swapBudget: config.swapBudget ?? 300
			});

			// Check for unassigned students
			if (result.unassignedStudentIds.length > 0) {
				return {
					success: false,
					message: `Failed to assign ${result.unassignedStudentIds.length} student(s): ${result.unassignedStudentIds.join(', ')}. All groups may be at capacity.`
				};
			}

			return {
				success: true,
				groups: result.groups
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error during grouping';
			return { success: false, message };
		}
	}

	/**
	 * Generate default groups based on student count.
	 * Targets 4-6 students per group, with an ideal size of 5.
	 */
	private generateDefaultGroups(studentCount: number): Group[] {
		const idealGroupSize = 5;
		const minGroupSize = 4;
		const maxGroupSize = 6;

		// Calculate number of groups
		let numGroups = Math.round(studentCount / idealGroupSize);
		if (numGroups === 0) numGroups = 1;

		// Ensure we don't have groups that are too small or too large
		const avgGroupSize = studentCount / numGroups;
		if (avgGroupSize < minGroupSize && numGroups > 1) {
			numGroups--;
		} else if (avgGroupSize > maxGroupSize) {
			numGroups++;
		}

		// Calculate capacity for each group to ensure balanced distribution
		// Use ceiling division to handle remainders
		const baseCapacity = Math.ceil(studentCount / numGroups);

		// Generate groups with capacity constraints
		const groups: Group[] = [];
		let remainingStudents = studentCount;
		for (let i = 1; i <= numGroups; i++) {
			const remainingGroups = numGroups - i + 1;
			const capacity = Math.ceil(remainingStudents / remainingGroups);

			groups.push({
				id: this.idGenerator.generateId(),
				name: `Group ${i}`,
				capacity: capacity,
				memberIds: []
			});

			remainingStudents -= capacity;
		}

		return groups;
	}
}

/**
 * Parse a preference payload into a StudentPreference object.
 * The payload is expected to conform to the StudentPreference interface.
 */
function parsePreferencePayload(payload: unknown, studentId: string): StudentPreference {
	if (!payload || typeof payload !== 'object') {
		return createEmptyPreference(studentId);
	}

	const pref = payload as Partial<StudentPreference>;

	return {
		studentId: pref.studentId ?? studentId,
		likeStudentIds: Array.isArray(pref.likeStudentIds) ? pref.likeStudentIds : [],
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
		likeStudentIds: [],
		avoidStudentIds: [],
		likeGroupIds: [],
		avoidGroupIds: []
	};
}
