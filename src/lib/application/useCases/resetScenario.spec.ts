import { describe, it, expect, beforeEach } from 'vitest';
import { resetScenario, type ResetScenarioInput } from './resetScenario';
import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import { isOk, isErr } from '$lib/types/result';
import type { Program, Pool, Scenario, Student } from '$lib/domain';

describe('resetScenario', () => {
	let env: ReturnType<typeof createInMemoryEnvironment>;
	let testProgram: Program;
	let testPool: Pool;
	let testStudents: Student[];

	beforeEach(() => {
		// Create a fresh environment with in-memory repos (not IndexedDB for tests)
		env = createInMemoryEnvironment(undefined, { useIndexedDbForScenarios: false });

		// Set up test students
		testStudents = [
			{ id: 'student-1', firstName: 'Alice', lastName: 'Smith' },
			{ id: 'student-2', firstName: 'Bob', lastName: 'Jones' },
			{ id: 'student-3', firstName: 'Carol', lastName: 'Davis' },
			{ id: 'student-4', firstName: 'Dave', lastName: 'Wilson' }
		];

		// Set up test data
		testPool = {
			id: 'pool-1',
			name: 'Test Class',
			type: 'CLASS',
			memberIds: ['student-1', 'student-2', 'student-3', 'student-4'],
			status: 'ACTIVE',
			ownerStaffIds: ['owner-1']
		};

		testProgram = {
			id: 'program-1',
			name: 'Test Activity',
			type: 'CLASS_ACTIVITY',
			poolIds: ['pool-1'],
			primaryPoolId: 'pool-1',
			timeSpan: { termLabel: 'Fall 2025' },
			ownerStaffIds: ['owner-1']
		};
	});

	// Helper to save test students to the repository
	async function saveTestStudents() {
		await env.studentRepo.saveMany(testStudents);
	}

	it('deletes existing scenario and creates new one', async () => {
		// Setup: create program, pool, students, and existing scenario
		await saveTestStudents();
		await env.poolRepo.save(testPool);
		await env.programRepo.save(testProgram);

		// Create an existing scenario with specific groups
		const existingScenario: Scenario = {
			id: 'scenario-old',
			programId: 'program-1',
			groups: [
				{ id: 'group-old-1', name: 'Group 1', capacity: 2, memberIds: ['student-1', 'student-2'] },
				{ id: 'group-old-2', name: 'Group 2', capacity: 2, memberIds: ['student-3', 'student-4'] }
			],
			participantSnapshot: ['student-1', 'student-2', 'student-3', 'student-4'],
			status: 'DRAFT',
			createdAt: new Date()
		};
		await env.scenarioRepo.save(existingScenario);

		// Act
		const result = await resetScenario(
			{
				scenarioRepo: env.scenarioRepo,
				programRepo: env.programRepo,
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				idGenerator: env.idGenerator,
				clock: env.clock,
				groupingAlgorithm: env.groupingAlgorithm
			},
			{ programId: 'program-1' }
		);

		// Assert
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			// New scenario should have a different ID
			expect(result.value.id).not.toBe('scenario-old');
			// Should have groups created by the algorithm
			expect(result.value.groups.length).toBeGreaterThan(0);
			// Participant snapshot should match pool members
			expect(result.value.participantSnapshot).toEqual(testPool.memberIds);
		}

		// Verify old scenario is gone
		const oldScenario = await env.scenarioRepo.getById('scenario-old');
		expect(oldScenario).toBeNull();
	});

	it('works when no existing scenario', async () => {
		// Setup: program, pool, and students, but no scenario
		await saveTestStudents();
		await env.poolRepo.save(testPool);
		await env.programRepo.save(testProgram);

		// Act
		const result = await resetScenario(
			{
				scenarioRepo: env.scenarioRepo,
				programRepo: env.programRepo,
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				idGenerator: env.idGenerator,
				clock: env.clock,
				groupingAlgorithm: env.groupingAlgorithm
			},
			{ programId: 'program-1' }
		);

		// Assert
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.programId).toBe('program-1');
			expect(result.value.groups.length).toBeGreaterThan(0);
		}
	});

	it('returns error when program not found', async () => {
		// Act - try to reset scenario for non-existent program
		const result = await resetScenario(
			{
				scenarioRepo: env.scenarioRepo,
				programRepo: env.programRepo,
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				idGenerator: env.idGenerator,
				clock: env.clock,
				groupingAlgorithm: env.groupingAlgorithm
			},
			{ programId: 'non-existent' }
		);

		// Assert
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.type).toBe('PROGRAM_NOT_FOUND');
		}
	});

	it('returns error when pool not found', async () => {
		// Setup: program with non-existent pool
		const programWithMissingPool: Program = {
			...testProgram,
			poolIds: ['missing-pool'],
			primaryPoolId: 'missing-pool'
		};
		await env.programRepo.save(programWithMissingPool);

		// Act
		const result = await resetScenario(
			{
				scenarioRepo: env.scenarioRepo,
				programRepo: env.programRepo,
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				idGenerator: env.idGenerator,
				clock: env.clock,
				groupingAlgorithm: env.groupingAlgorithm
			},
			{ programId: 'program-1' }
		);

		// Assert
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.type).toBe('POOL_NOT_FOUND');
		}
	});

	it('returns error when pool has no members', async () => {
		// Setup: pool with no members
		const emptyPool: Pool = {
			...testPool,
			memberIds: []
		};
		await env.poolRepo.save(emptyPool);
		await env.programRepo.save(testProgram);

		// Act
		const result = await resetScenario(
			{
				scenarioRepo: env.scenarioRepo,
				programRepo: env.programRepo,
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				idGenerator: env.idGenerator,
				clock: env.clock,
				groupingAlgorithm: env.groupingAlgorithm
			},
			{ programId: 'program-1' }
		);

		// Assert
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.type).toBe('POOL_HAS_NO_MEMBERS');
		}
	});
});
