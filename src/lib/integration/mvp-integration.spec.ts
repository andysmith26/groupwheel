import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import {
	importRoster,
	createProgram,
	generateScenario,
	computeAnalytics
} from '$lib/services/appEnvUseCases';
import { isOk, isErr } from '$lib/types/result';

/**
 * Integration tests for the full MVP flow:
 * Pool Import → Program Creation → Preferences → Scenario Generation → Analytics
 *
 * These tests verify that data flows correctly through all layers without
 * testing individual components in isolation.
 */
describe('MVP Integration: Full Workflow', () => {
	let env: InMemoryEnvironment;

	beforeEach(() => {
		env = createInMemoryEnvironment();
	});

	/**
	 * Helper to add preferences directly to the repository.
	 * Uses the setForProgram test helper on the repository to avoid manual loops.
	 */
	async function addPreferences(
		programId: string,
		prefs: Array<{ studentId: string; likeStudentIds: string[] }>
	) {
		const repo = env.preferenceRepo;
		if (!repo.setForProgram) {
			throw new Error('setForProgram is required on PreferenceRepository for integration tests');
		}
		const preferences = prefs.map((p, i) => ({
			id: `pref-${i}`,
			programId,
			studentId: p.studentId,
			payload: { likeStudentIds: p.likeStudentIds }
		}));
		await repo.setForProgram(programId, preferences);
	}

	describe('Happy Path: Pool → Program → Scenario → Analytics', () => {
		it('completes full flow with preferences', async () => {
			// Step 1: Import a roster to create a Pool
			const rosterResult = await importRoster(env, {
				pastedText: `name\tid\tgrade
Alice Smith\talice@school.edu\t9
Bob Jones\tbob@school.edu\t9
Carol White\tcarol@school.edu\t9
Dave Brown\tdave@school.edu\t9`,
				poolName: 'Grade 9 Class',
				poolType: 'GRADE',
				ownerStaffId: 'owner-1'
			});

			expect(isOk(rosterResult)).toBe(true);
			if (!isOk(rosterResult)) return;

			const pool = rosterResult.value;
			expect(pool.name).toBe('Grade 9 Class');
			expect(pool.memberIds).toHaveLength(4);

			// Step 2: Create a Program using the Pool
			const programResult = await createProgram(env, {
				name: 'Fall Advisory Groups',
				type: 'ADVISORY',
				timeSpan: { termLabel: 'Fall 2024' },
				primaryPoolId: pool.id,
				ownerStaffIds: ['owner-1']
			});

			expect(isOk(programResult)).toBe(true);
			if (!isOk(programResult)) return;

			const program = programResult.value;
			expect(program.name).toBe('Fall Advisory Groups');
			expect(program.primaryPoolId).toBe(pool.id);

			// Step 3: Add preferences for the students
			// Alice wants Bob and Carol
			// Bob wants Alice
			// Carol wants Dave
			// Dave wants Carol and Alice
			await addPreferences(program.id, [
				{ studentId: 'alice@school.edu', likeStudentIds: ['bob@school.edu', 'carol@school.edu'] },
				{ studentId: 'bob@school.edu', likeStudentIds: ['alice@school.edu'] },
				{ studentId: 'carol@school.edu', likeStudentIds: ['dave@school.edu'] },
				{ studentId: 'dave@school.edu', likeStudentIds: ['carol@school.edu', 'alice@school.edu'] }
			]);

			// Step 4: Generate a Scenario
			const scenarioResult = await generateScenario(env, {
				programId: program.id,
				createdByStaffId: 'owner-1'
			});

			expect(isOk(scenarioResult)).toBe(true);
			if (!isOk(scenarioResult)) return;

			const scenario = scenarioResult.value;
			expect(scenario.programId).toBe(program.id);
			expect(scenario.participantSnapshot).toHaveLength(4);
			expect(scenario.groups.length).toBeGreaterThan(0);

			// All students should be assigned
			const assignedStudents = scenario.groups.flatMap((g) => g.memberIds);
			expect(assignedStudents).toHaveLength(4);
			expect(new Set(assignedStudents).size).toBe(4); // No duplicates

			// Step 5: Compute Analytics
			const analyticsResult = await computeAnalytics(env, {
				scenarioId: scenario.id
			});

			expect(isOk(analyticsResult)).toBe(true);
			if (!isOk(analyticsResult)) return;

			const analytics = analyticsResult.value;
			// Analytics should have valid percentages
			expect(analytics.percentAssignedTopChoice).toBeGreaterThanOrEqual(0);
			expect(analytics.percentAssignedTopChoice).toBeLessThanOrEqual(100);
			expect(analytics.percentAssignedTop2).toBeGreaterThanOrEqual(0);
			expect(analytics.percentAssignedTop2).toBeLessThanOrEqual(100);
			// Average rank should be positive (1 is best)
			if (!isNaN(analytics.averagePreferenceRankAssigned)) {
				expect(analytics.averagePreferenceRankAssigned).toBeGreaterThanOrEqual(1);
			}
		});

		it('works without preferences (random grouping)', async () => {
			// Import roster
			const rosterResult = await importRoster(env, {
				pastedText: `name\tid
Student A\ta@school.edu
Student B\tb@school.edu
Student C\tc@school.edu
Student D\td@school.edu
Student E\te@school.edu
Student F\tf@school.edu`,
				poolName: 'Test Pool',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			});

			expect(isOk(rosterResult)).toBe(true);
			if (!isOk(rosterResult)) return;

			// Create program
			const programResult = await createProgram(env, {
				name: 'No Preferences Test',
				type: 'CLASS_ACTIVITY',
				timeSpan: { termLabel: 'Test' },
				primaryPoolId: rosterResult.value.id
			});

			expect(isOk(programResult)).toBe(true);
			if (!isOk(programResult)) return;

			// Generate scenario without preferences
			const scenarioResult = await generateScenario(env, {
				programId: programResult.value.id
			});

			expect(isOk(scenarioResult)).toBe(true);
			if (!isOk(scenarioResult)) return;

			const scenario = scenarioResult.value;
			expect(scenario.participantSnapshot).toHaveLength(6);
			expect(scenario.groups.length).toBeGreaterThan(0);

			// All students assigned
			const assigned = scenario.groups.flatMap((g) => g.memberIds);
			expect(assigned).toHaveLength(6);

			// Analytics should work with no preferences
			const analyticsResult = await computeAnalytics(env, {
				scenarioId: scenario.id
			});

			expect(isOk(analyticsResult)).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('fails when creating program with non-existent pool', async () => {
			const result = await createProgram(env, {
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Test' },
				primaryPoolId: 'nonexistent-pool-id'
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.type).toBe('POOL_NOT_FOUND');
			}
		});

		it('fails when generating scenario for non-existent program', async () => {
			const result = await generateScenario(env, {
				programId: 'nonexistent-program-id'
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.type).toBe('PROGRAM_NOT_FOUND');
			}
		});

		it('fails when computing analytics for non-existent scenario', async () => {
			const result = await computeAnalytics(env, {
				scenarioId: 'nonexistent-scenario-id'
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.type).toBe('SCENARIO_NOT_FOUND');
			}
		});

		it('fails with empty roster (parse error on header-only input)', async () => {
			const result = await importRoster(env, {
				pastedText: 'name\tid\n',
				poolName: 'Empty Pool',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			});

			// Parser returns PARSE_ERROR for header-only input (no data rows)
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				// Accept either PARSE_ERROR or NO_STUDENTS_IN_ROSTER
				expect(['PARSE_ERROR', 'NO_STUDENTS_IN_ROSTER']).toContain(result.error.type);
			}
		});

		it('fails with empty program name', async () => {
			// First create a valid pool
			const rosterResult = await importRoster(env, {
				pastedText: 'name\tid\nTest\ttest@school.edu',
				poolName: 'Test Pool',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			});
			expect(isOk(rosterResult)).toBe(true);
			if (!isOk(rosterResult)) return;

			const result = await createProgram(env, {
				name: '',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Test' },
				primaryPoolId: rosterResult.value.id
			});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.type).toBe('DOMAIN_VALIDATION_FAILED');
			}
		});
	});

	describe('Preferences Edge Cases', () => {
		it('handles preferences with students not in pool', async () => {
			// Create pool with only 2 students
			const rosterResult = await importRoster(env, {
				pastedText: 'name\tid\nAlice\talice@school.edu\nBob\tbob@school.edu',
				poolName: 'Small Pool',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			});
			expect(isOk(rosterResult)).toBe(true);
			if (!isOk(rosterResult)) return;

			const programResult = await createProgram(env, {
				name: 'Test',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Test' },
				primaryPoolId: rosterResult.value.id
			});
			expect(isOk(programResult)).toBe(true);
			if (!isOk(programResult)) return;

			// Add preference that references non-existent student
			await addPreferences(programResult.value.id, [
				{
					studentId: 'alice@school.edu',
					likeStudentIds: ['bob@school.edu', 'nonexistent@school.edu']
				}
			]);

			// Should still generate scenario successfully
			const scenarioResult = await generateScenario(env, {
				programId: programResult.value.id
			});

			expect(isOk(scenarioResult)).toBe(true);
		});

		it('handles circular preferences (A wants B, B wants A)', async () => {
			const rosterResult = await importRoster(env, {
				pastedText: 'name\tid\nAlice\talice@school.edu\nBob\tbob@school.edu',
				poolName: 'Pair Pool',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			});
			expect(isOk(rosterResult)).toBe(true);
			if (!isOk(rosterResult)) return;

			const programResult = await createProgram(env, {
				name: 'Mutual Friends',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Test' },
				primaryPoolId: rosterResult.value.id
			});
			expect(isOk(programResult)).toBe(true);
			if (!isOk(programResult)) return;

			// Circular preferences
			await addPreferences(programResult.value.id, [
				{ studentId: 'alice@school.edu', likeStudentIds: ['bob@school.edu'] },
				{ studentId: 'bob@school.edu', likeStudentIds: ['alice@school.edu'] }
			]);

			const scenarioResult = await generateScenario(env, {
				programId: programResult.value.id
			});

			expect(isOk(scenarioResult)).toBe(true);
			if (!isOk(scenarioResult)) return;

			// With mutual preferences and only 2 students, they should be in same group
			// (assuming the algorithm puts them together)
			const scenario = scenarioResult.value;
			const aliceGroup = scenario.groups.find((g) => g.memberIds.includes('alice@school.edu'));
			const bobGroup = scenario.groups.find((g) => g.memberIds.includes('bob@school.edu'));

			expect(aliceGroup).toBeDefined();
			expect(bobGroup).toBeDefined();
			// In a 2-student scenario, they're likely in the same group
			// (depends on algorithm config, but this tests the flow works)
		});
	});
});
