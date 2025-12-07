/**
 * Test fixtures for Friend Hat.
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
 * @module test-utils/fixtures
 */

import type { Pool, Program, Student, Preference } from '$lib/domain';
import type { StudentPreference } from '$lib/domain/preference';
import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

// =============================================================================
// Test Students
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

// =============================================================================
// Test Pool
// =============================================================================

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

// =============================================================================
// Test Program
// =============================================================================

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

// =============================================================================
// Test Preferences
// =============================================================================

/**
 * Test preferences that showcase the balanced grouping algorithm:
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
 * No preferences:
 * - Kevin, Luna
 */
export const testPreferences: Preference[] = [
	{
		id: 'pref-1',
		programId: testProgram.id,
		studentId: 'stu-1',
		payload: {
			studentId: 'stu-1',
			likeStudentIds: ['stu-2'],
			avoidStudentIds: [],
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
			likeStudentIds: ['stu-1'],
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
			likeStudentIds: ['stu-4'],
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
			likeStudentIds: ['stu-3'],
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
			likeStudentIds: ['stu-6', 'stu-7'],
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
			likeStudentIds: ['stu-5', 'stu-7'],
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
			likeStudentIds: ['stu-5', 'stu-6'],
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
			likeStudentIds: ['stu-9'],
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
			likeStudentIds: ['stu-8'],
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-10',
		programId: testProgram.id,
		studentId: 'stu-10',
		payload: {
			studentId: 'stu-10',
			likeStudentIds: ['stu-11'],
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
			likeStudentIds: [],
			avoidStudentIds: [],
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
			likeStudentIds: [],
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	}
];

// =============================================================================
// Fixture Seeding Function
// =============================================================================

/**
 * Result of creating test fixtures.
 */
export interface TestFixtureResult {
	program: Program;
	pool: Pool;
	students: Student[];
	preferences: Preference[];
}

/**
 * Seed the in-memory environment with test fixtures.
 *
 * Creates students, a pool, a program, and preferences that can be used
 * for integration testing of the grouping algorithm and related features.
 *
 * This function is idempotent - calling it multiple times will not create
 * duplicates if the fixtures already exist.
 *
 * @param env - The in-memory environment to seed
 * @returns The created/existing program and pool
 */
export async function createTestFixtures(
	env: InMemoryEnvironment
): Promise<TestFixtureResult> {
	const existingProgram = await env.programRepo.getById(testProgram.id);
	const existingPool = await env.poolRepo.getById(testPool.id);

	// Always ensure students exist before saving a pool/program.
	await env.studentRepo.saveMany(testStudents);

	if (!existingPool) {
		await env.poolRepo.save(testPool);
	}

	if (!existingProgram) {
		await env.programRepo.save(testProgram);
	}

	// Seed preferences for the test program
	const existingPreferences = await env.preferenceRepo.listByProgramId(testProgram.id);
	if (existingPreferences.length === 0) {
		if (env.preferenceRepo.setForProgram) {
			await env.preferenceRepo.setForProgram(testProgram.id, testPreferences);
		} else {
			for (const pref of testPreferences) {
				await env.preferenceRepo.save(pref);
			}
		}
	}

	const program = (await env.programRepo.getById(testProgram.id)) ?? testProgram;
	const pool = (await env.poolRepo.getById(testPool.id)) ?? testPool;

	return {
		program,
		pool,
		students: testStudents,
		preferences: testPreferences
	};
}
