/**
 * Test fixtures for Turntable.
 *
 * Provides pre-built test data with deterministic IDs for use in integration
 * tests and spec files. These fixtures allow tests to have predictable data
 * to assert against.
 *
 * ARCHITECTURE NOTE: This file accesses repositories directly rather than
 * going through use cases. This is an intentional exception for test fixtures
 * because:
 * - Tests need deterministic IDs (e.g., 'stu-1') for assertions
 * - Fixtures may need to bypass business rules to set up edge cases
 * - Use case APIs don't expose ID specification
 *
 * Note: As of the Turntable pivot (December 2025), friend-based preferences
 * (likeStudentIds) have been removed. Preferences now use group requests
 * (likeGroupIds) instead. See PROJECT_HISTORY.md.
 *
 * @module test-utils/fixtures
 */

import type { Pool, Program, Student, Preference, Group } from '$lib/domain';
import type { StudentPreference } from '$lib/domain/preference';
import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

// =============================================================================
// DATASET 1: SMALL (8 students, simple preferences)
// =============================================================================

/**
 * Small dataset: 8 students in grade 3 with simple preference patterns.
 * Use case: Testing basic grouping with small class sizes.
 */
export const smallStudents: Student[] = [
	{ id: 'stu-s1', firstName: 'Alex', lastName: 'Adams', gradeLevel: '3' },
	{ id: 'stu-s2', firstName: 'Bailey', lastName: 'Brooks', gradeLevel: '3' },
	{ id: 'stu-s3', firstName: 'Casey', lastName: 'Cruz', gradeLevel: '3' },
	{ id: 'stu-s4', firstName: 'Drew', lastName: 'Davis', gradeLevel: '3' },
	{ id: 'stu-s5', firstName: 'Elliot', lastName: 'Evans', gradeLevel: '3' },
	{ id: 'stu-s6', firstName: 'Finley', lastName: 'Foster', gradeLevel: '3' },
	{ id: 'stu-s7', firstName: 'Gray', lastName: 'Green', gradeLevel: '3' },
	{ id: 'stu-s8', firstName: 'Harper', lastName: 'Hill', gradeLevel: '3' }
];

/**
 * Predefined groups for small dataset.
 */
export const smallGroups: Group[] = [
	{ id: 'grp-s1', name: 'Red Team', capacity: 4, memberIds: [] },
	{ id: 'grp-s2', name: 'Blue Team', capacity: 4, memberIds: [] }
];

export const smallPool: Pool = {
	id: 'pool-small',
	name: 'Grade 3 Class',
	type: 'CLASS',
	memberIds: smallStudents.map((s) => s.id),
	status: 'ACTIVE',
	primaryStaffOwnerId: 'owner-1',
	source: 'MANUAL'
};

export const smallProgram: Program = {
	id: 'program-small',
	name: 'Small Class Activity',
	type: 'CLASS_ACTIVITY',
	timeSpan: { termLabel: 'Spring 2024' },
	poolIds: [smallPool.id],
	primaryPoolId: smallPool.id,
	ownerStaffIds: ['owner-1']
};

/**
 * Simple preferences for small dataset:
 * - Gray wants Red Team
 * - Harper avoids Blue Team
 * (Friend preferences removed in Turntable pivot)
 */
export const smallPreferences: Preference[] = [
	{
		id: 'pref-s1',
		programId: smallProgram.id,
		studentId: 'stu-s1',
		payload: {
			studentId: 'stu-s1',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-s2',
		programId: smallProgram.id,
		studentId: 'stu-s2',
		payload: {
			studentId: 'stu-s2',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-s3',
		programId: smallProgram.id,
		studentId: 'stu-s3',
		payload: {
			studentId: 'stu-s3',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-s4',
		programId: smallProgram.id,
		studentId: 'stu-s4',
		payload: {
			studentId: 'stu-s4',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-s5',
		programId: smallProgram.id,
		studentId: 'stu-s5',
		payload: {
			studentId: 'stu-s5',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-s6',
		programId: smallProgram.id,
		studentId: 'stu-s6',
		payload: {
			studentId: 'stu-s6',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-s7',
		programId: smallProgram.id,
		studentId: 'stu-s7',
		payload: {
			studentId: 'stu-s7',
			avoidStudentIds: [],
			likeGroupIds: ['grp-s1'], // Wants Red Team
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-s8',
		programId: smallProgram.id,
		studentId: 'stu-s8',
		payload: {
			studentId: 'stu-s8',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: ['grp-s2'] // Avoids Blue Team
		} satisfies StudentPreference
	}
];

// =============================================================================
// DATASET 2: MEDIUM (12 students, moderate complexity)
// =============================================================================

/**
 * 12 test students with deterministic IDs (stu-1 through stu-12).
 * All in grade 5, alphabetically named for easy identification.
 */
export const testStudents: Student[] = [
	{ id: 'stu-1', firstName: 'Alice', lastName: 'Anderson', gradeLevel: '5' },
	{ id: 'stu-2', firstName: 'Brandon', lastName: 'Baker', gradeLevel: '5' },
	{ id: 'stu-3', firstName: 'Carmen', lastName: 'Castillo', gradeLevel: '5' },
	{ id: 'stu-4', firstName: 'Diego', lastName: 'Diaz', gradeLevel: '5' },
	{ id: 'stu-5', firstName: 'Emi', lastName: 'Edwards', gradeLevel: '5' },
	{ id: 'stu-6', firstName: 'Farah', lastName: 'Frey', gradeLevel: '5' },
	{ id: 'stu-7', firstName: 'Gabriel', lastName: 'Garcia', gradeLevel: '5' },
	{ id: 'stu-8', firstName: 'Hannah', lastName: 'Harris', gradeLevel: '5' },
	{ id: 'stu-9', firstName: 'Isaac', lastName: 'Ivanov', gradeLevel: '5' },
	{ id: 'stu-10', firstName: 'Julia', lastName: 'Johnson', gradeLevel: '5' },
	{ id: 'stu-11', firstName: 'Kevin', lastName: 'Kim', gradeLevel: '5' },
	{ id: 'stu-12', firstName: 'Luna', lastName: 'Lopez', gradeLevel: '5' }
];

/**
 * Predefined groups for medium dataset.
 */
export const testGroups: Group[] = [
	{ id: 'grp-1', name: 'Group Alpha', capacity: 4, memberIds: [] },
	{ id: 'grp-2', name: 'Group Beta', capacity: 4, memberIds: [] },
	{ id: 'grp-3', name: 'Group Gamma', capacity: 4, memberIds: [] }
];

/**
 * Test pool containing all 12 test students.
 */
export const testPool: Pool = {
	id: 'pool-test',
	name: 'Test Class Pool',
	type: 'CLASS',
	memberIds: testStudents.map((student) => student.id),
	status: 'ACTIVE',
	primaryStaffOwnerId: 'owner-1',
	source: 'MANUAL'
};

/**
 * Test program linked to the test pool.
 */
export const testProgram: Program = {
	id: 'program-test',
	name: 'Test Grouping Activity',
	type: 'CLASS_ACTIVITY',
	timeSpan: { termLabel: 'Test Term' },
	poolIds: [testPool.id],
	primaryPoolId: testPool.id,
	ownerStaffIds: ['owner-1']
};

/**
 * Test preferences showcasing moderate complexity:
 *
 * Mutual friendships (should be grouped together):
 * - Alice ↔ Brandon
 * - Carmen ↔ Diego
 * - Emi ↔ Farah ↔ Gabriel (triangle)
 * - Hannah ↔ Isaac
 *
 * One-way preferences (no guarantee of grouping):
 * - Julia → Kevin
 *
 * Avoidances (should NOT be grouped together):
 * - Alice avoids Diego
 * - Kevin avoids Brandon
 *
 * Group preferences:
 * - Luna wants Group Alpha
 * - Isaac avoids Group Gamma
 *
 * No preferences:
 * - (all students now have some preference)
 */
export const testPreferences: Preference[] = [
	{
		id: 'pref-1',
		programId: testProgram.id,
		studentId: 'stu-1',
		payload: {
			studentId: 'stu-1',
			avoidStudentIds: ['stu-4'], // Alice avoids Diego
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-2',
		programId: testProgram.id,
		studentId: 'stu-2',
		payload: {
			studentId: 'stu-2',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-3',
		programId: testProgram.id,
		studentId: 'stu-3',
		payload: {
			studentId: 'stu-3',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-4',
		programId: testProgram.id,
		studentId: 'stu-4',
		payload: {
			studentId: 'stu-4',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-5',
		programId: testProgram.id,
		studentId: 'stu-5',
		payload: {
			studentId: 'stu-5',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-6',
		programId: testProgram.id,
		studentId: 'stu-6',
		payload: {
			studentId: 'stu-6',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-7',
		programId: testProgram.id,
		studentId: 'stu-7',
		payload: {
			studentId: 'stu-7',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-8',
		programId: testProgram.id,
		studentId: 'stu-8',
		payload: {
			studentId: 'stu-8',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-9',
		programId: testProgram.id,
		studentId: 'stu-9',
		payload: {
			studentId: 'stu-9',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: ['grp-3'] // Isaac avoids Group Gamma
		} satisfies StudentPreference
	},
	{
		id: 'pref-10',
		programId: testProgram.id,
		studentId: 'stu-10',
		payload: {
			studentId: 'stu-10',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-11',
		programId: testProgram.id,
		studentId: 'stu-11',
		payload: {
			studentId: 'stu-11',
			avoidStudentIds: ['stu-2'], // Kevin avoids Brandon
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-12',
		programId: testProgram.id,
		studentId: 'stu-12',
		payload: {
			studentId: 'stu-12',
			avoidStudentIds: [],
			likeGroupIds: ['grp-1'], // Luna wants Group Alpha
			avoidGroupIds: []
		} satisfies StudentPreference
	}
];

// =============================================================================
// DATASET 3: LARGE (20 students, complex preferences)
// =============================================================================

/**
 * Large dataset: 20 students in grade 7 with complex preference networks.
 * Use case: Testing scalability and complex social dynamics.
 */
export const largeStudents: Student[] = [
	{ id: 'stu-l1', firstName: 'Aiden', lastName: 'Allen', gradeLevel: '7' },
	{ id: 'stu-l2', firstName: 'Bella', lastName: 'Brown', gradeLevel: '7' },
	{ id: 'stu-l3', firstName: 'Carter', lastName: 'Clark', gradeLevel: '7' },
	{ id: 'stu-l4', firstName: 'Dylan', lastName: 'Dunn', gradeLevel: '7' },
	{ id: 'stu-l5', firstName: 'Emma', lastName: 'Ellis', gradeLevel: '7' },
	{ id: 'stu-l6', firstName: 'Felix', lastName: 'Flynn', gradeLevel: '7' },
	{ id: 'stu-l7', firstName: 'Grace', lastName: 'Grant', gradeLevel: '7' },
	{ id: 'stu-l8', firstName: 'Henry', lastName: 'Hayes', gradeLevel: '7' },
	{ id: 'stu-l9', firstName: 'Iris', lastName: 'Ingram', gradeLevel: '7' },
	{ id: 'stu-l10', firstName: 'Jack', lastName: 'James', gradeLevel: '7' },
	{ id: 'stu-l11', firstName: 'Kai', lastName: 'King', gradeLevel: '7' },
	{ id: 'stu-l12', firstName: 'Lily', lastName: 'Lee', gradeLevel: '7' },
	{ id: 'stu-l13', firstName: 'Mason', lastName: 'Miller', gradeLevel: '7' },
	{ id: 'stu-l14', firstName: 'Nova', lastName: 'Nelson', gradeLevel: '7' },
	{ id: 'stu-l15', firstName: 'Owen', lastName: 'Owens', gradeLevel: '7' },
	{ id: 'stu-l16', firstName: 'Piper', lastName: 'Parker', gradeLevel: '7' },
	{ id: 'stu-l17', firstName: 'Quinn', lastName: 'Quinn', gradeLevel: '7' },
	{ id: 'stu-l18', firstName: 'Riley', lastName: 'Reed', gradeLevel: '7' },
	{ id: 'stu-l19', firstName: 'Sage', lastName: 'Scott', gradeLevel: '7' },
	{ id: 'stu-l20', firstName: 'Taylor', lastName: 'Torres', gradeLevel: '7' }
];

/**
 * Predefined groups for large dataset.
 */
export const largeGroups: Group[] = [
	{ id: 'grp-l1', name: 'Eagles', capacity: 5, memberIds: [] },
	{ id: 'grp-l2', name: 'Hawks', capacity: 5, memberIds: [] },
	{ id: 'grp-l3', name: 'Falcons', capacity: 5, memberIds: [] },
	{ id: 'grp-l4', name: 'Ravens', capacity: 5, memberIds: [] }
];

export const largePool: Pool = {
	id: 'pool-large',
	name: 'Grade 7 Class',
	type: 'CLASS',
	memberIds: largeStudents.map((s) => s.id),
	status: 'ACTIVE',
	primaryStaffOwnerId: 'owner-1',
	source: 'MANUAL'
};

export const largeProgram: Program = {
	id: 'program-large',
	name: 'Large Class Activity',
	type: 'CLASS_ACTIVITY',
	timeSpan: { termLabel: 'Fall 2024' },
	poolIds: [largePool.id],
	primaryPoolId: largePool.id,
	ownerStaffIds: ['owner-1']
};

/**
 * Complex preferences for large dataset:
 *
 * Multiple friend groups:
 * - Aiden ↔ Bella ↔ Carter (triangle)
 * - Dylan ↔ Emma
 * - Felix, Grace, Henry, and Iris (interconnected group centered around Grace and Henry; not a complete quad)
 * - Jack ↔ Kai
 * - Lily ↔ Mason ↔ Nova (triangle)
 *
 * Avoidances (conflicts):
 * - Aiden avoids Dylan
 * - Carter avoids Owen
 * - Emma avoids Piper
 * - Henry avoids Quinn
 * - Nova avoids Riley
 * - Sage avoids Taylor
 *
 * Group preferences:
 * - Owen wants Eagles
 * - Piper wants Hawks
 * - Quinn avoids Falcons
 * - Riley wants Ravens
 * - Sage avoids Eagles
 * - Taylor wants Falcons
 *
 * One-way preferences:
 * - Owen → Piper
 * - Riley → Sage
 */
export const largePreferences: Preference[] = [
	// Aiden ↔ Bella ↔ Carter triangle
	{
		id: 'pref-l1',
		programId: largeProgram.id,
		studentId: 'stu-l1',
		payload: {
			studentId: 'stu-l1',
			avoidStudentIds: ['stu-l4'],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l2',
		programId: largeProgram.id,
		studentId: 'stu-l2',
		payload: {
			studentId: 'stu-l2',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l3',
		programId: largeProgram.id,
		studentId: 'stu-l3',
		payload: {
			studentId: 'stu-l3',
			avoidStudentIds: ['stu-l15'],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Dylan ↔ Emma
	{
		id: 'pref-l4',
		programId: largeProgram.id,
		studentId: 'stu-l4',
		payload: {
			studentId: 'stu-l4',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l5',
		programId: largeProgram.id,
		studentId: 'stu-l5',
		payload: {
			studentId: 'stu-l5',
			avoidStudentIds: ['stu-l16'],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Felix ↔ Grace ↔ Henry ↔ Iris quad
	{
		id: 'pref-l6',
		programId: largeProgram.id,
		studentId: 'stu-l6',
		payload: {
			studentId: 'stu-l6',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l7',
		programId: largeProgram.id,
		studentId: 'stu-l7',
		payload: {
			studentId: 'stu-l7',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l8',
		programId: largeProgram.id,
		studentId: 'stu-l8',
		payload: {
			studentId: 'stu-l8',
			avoidStudentIds: ['stu-l17'],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l9',
		programId: largeProgram.id,
		studentId: 'stu-l9',
		payload: {
			studentId: 'stu-l9',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Jack ↔ Kai
	{
		id: 'pref-l10',
		programId: largeProgram.id,
		studentId: 'stu-l10',
		payload: {
			studentId: 'stu-l10',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l11',
		programId: largeProgram.id,
		studentId: 'stu-l11',
		payload: {
			studentId: 'stu-l11',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Lily ↔ Mason ↔ Nova triangle
	{
		id: 'pref-l12',
		programId: largeProgram.id,
		studentId: 'stu-l12',
		payload: {
			studentId: 'stu-l12',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l13',
		programId: largeProgram.id,
		studentId: 'stu-l13',
		payload: {
			studentId: 'stu-l13',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-l14',
		programId: largeProgram.id,
		studentId: 'stu-l14',
		payload: {
			studentId: 'stu-l14',
			avoidStudentIds: ['stu-l18'],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Owen with group preference and one-way to Piper
	{
		id: 'pref-l15',
		programId: largeProgram.id,
		studentId: 'stu-l15',
		payload: {
			studentId: 'stu-l15',
			avoidStudentIds: [],
			likeGroupIds: ['grp-l1'], // wants Eagles
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Piper with group preference
	{
		id: 'pref-l16',
		programId: largeProgram.id,
		studentId: 'stu-l16',
		payload: {
			studentId: 'stu-l16',
			avoidStudentIds: [],
			likeGroupIds: ['grp-l2'], // wants Hawks
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Quinn avoids group
	{
		id: 'pref-l17',
		programId: largeProgram.id,
		studentId: 'stu-l17',
		payload: {
			studentId: 'stu-l17',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: ['grp-l3'] // avoids Falcons
		} satisfies StudentPreference
	},
	// Riley with group preference and one-way to Sage
	{
		id: 'pref-l18',
		programId: largeProgram.id,
		studentId: 'stu-l18',
		payload: {
			studentId: 'stu-l18',
			avoidStudentIds: [],
			likeGroupIds: ['grp-l4'], // wants Ravens
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	// Sage avoids group and student
	{
		id: 'pref-l19',
		programId: largeProgram.id,
		studentId: 'stu-l19',
		payload: {
			studentId: 'stu-l19',
			avoidStudentIds: ['stu-l20'],
			likeGroupIds: [],
			avoidGroupIds: ['grp-l1'] // avoids Eagles
		} satisfies StudentPreference
	},
	// Taylor with group preference
	{
		id: 'pref-l20',
		programId: largeProgram.id,
		studentId: 'stu-l20',
		payload: {
			studentId: 'stu-l20',
			avoidStudentIds: [],
			likeGroupIds: ['grp-l3'], // wants Falcons
			avoidGroupIds: []
		} satisfies StudentPreference
	}
];

// =============================================================================
// Fixture Seeding Function
// =============================================================================

/**
 * Dataset type for test fixtures.
 */
export type FixtureDataset = 'small' | 'medium' | 'large';

/**
 * Result of creating test fixtures.
 */
export interface TestFixtureResult {
	program: Program;
	pool: Pool;
	students: Student[];
	preferences: Preference[];
	groups: Group[];
}

/**
 * Seed the in-memory environment with test fixtures.
 *
 * Creates students, a pool, a program, preferences, and groups that can be used
 * for integration testing of the grouping algorithm and related features.
 *
 * This function is idempotent - calling it multiple times will not create
 * duplicates if the fixtures already exist.
 *
 * @param env - The in-memory environment to seed
 * @param dataset - Which dataset to use: 'small', 'medium', or 'large'. Defaults to 'medium'.
 * @returns The created/existing program, pool, students, preferences, and groups
 */
export async function createTestFixtures(
	env: InMemoryEnvironment,
	dataset: FixtureDataset = 'medium'
): Promise<TestFixtureResult> {
	// Select dataset based on parameter
	let students: Student[];
	let pool: Pool;
	let program: Program;
	let preferences: Preference[];
	let groups: Group[];

	switch (dataset) {
		case 'small':
			students = smallStudents;
			pool = smallPool;
			program = smallProgram;
			preferences = smallPreferences;
			groups = smallGroups;
			break;
		case 'large':
			students = largeStudents;
			pool = largePool;
			program = largeProgram;
			preferences = largePreferences;
			groups = largeGroups;
			break;
		case 'medium':
		default:
			students = testStudents;
			pool = testPool;
			program = testProgram;
			preferences = testPreferences;
			groups = testGroups;
			break;
	}

	const existingProgram = await env.programRepo.getById(program.id);
	const existingPool = await env.poolRepo.getById(pool.id);

	// Always ensure students exist before saving a pool/program.
	await env.studentRepo.saveMany(students);

	if (!existingPool) {
		await env.poolRepo.save(pool);
	}

	if (!existingProgram) {
		await env.programRepo.save(program);
	}

	// Seed preferences for the program
	const existingPreferences = await env.preferenceRepo.listByProgramId(program.id);
	if (existingPreferences.length === 0) {
		if (env.preferenceRepo.setForProgram) {
			await env.preferenceRepo.setForProgram(program.id, preferences);
		} else {
			for (const pref of preferences) {
				await env.preferenceRepo.save(pref);
			}
		}
	}

	const finalProgram = (await env.programRepo.getById(program.id)) ?? program;
	const finalPool = (await env.poolRepo.getById(pool.id)) ?? pool;

	return {
		program: finalProgram,
		pool: finalPool,
		students,
		preferences,
		groups
	};
}
