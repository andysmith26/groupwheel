import { describe, it, expect } from 'vitest';
import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import { createTestFixtures } from './fixtures';
import { generateScenarioForProgram } from '$lib/application/useCases/generateScenario';

describe('Test Fixtures with Balanced Grouping', () => {
	it('should create fixtures and generate balanced groups respecting preferences', async () => {
		const env = createInMemoryEnvironment();
		const { program } = await createTestFixtures(env);

		// Generate scenario using the balanced grouping algorithm
		const result = await generateScenarioForProgram(env, {
			programId: program.id,
			createdByStaffId: 'owner-1'
		});

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;

		const scenario = result.value;

		// Should have 12 students (participantSnapshot is the field name)
		expect(scenario.participantSnapshot).toHaveLength(12);

		// Should create 2-3 balanced groups (12 students / 5 per group ≈ 2-3 groups)
		expect(scenario.groups.length).toBeGreaterThanOrEqual(2);
		expect(scenario.groups.length).toBeLessThanOrEqual(3);

		// All students should be assigned
		const allMemberIds = scenario.groups.flatMap((g) => g.memberIds);
		expect(allMemberIds).toHaveLength(12);
		expect(new Set(allMemberIds).size).toBe(12); // No duplicates

		// Each group should be reasonably sized
		for (const group of scenario.groups) {
			expect(group.memberIds.length).toBeGreaterThanOrEqual(4);
			expect(group.memberIds.length).toBeLessThanOrEqual(6);
		}

		// Test mutual friend preferences are respected
		// Alice (stu-1) and Brandon (stu-2) should be in the same group
		const aliceGroup = scenario.groups.find((g) => g.memberIds.includes('stu-1'));
		expect(aliceGroup).toBeDefined();
		expect(aliceGroup!.memberIds).toContain('stu-2');

		// Carmen (stu-3) and Diego (stu-4) should be in the same group
		const carmenGroup = scenario.groups.find((g) => g.memberIds.includes('stu-3'));
		expect(carmenGroup).toBeDefined();
		expect(carmenGroup!.memberIds).toContain('stu-4');

		// Emi, Farah, Gabriel (stu-5, stu-6, stu-7) - triangle of mutual friends
		// Should be in the same group
		const emiGroup = scenario.groups.find((g) => g.memberIds.includes('stu-5'));
		expect(emiGroup).toBeDefined();
		expect(emiGroup!.memberIds).toContain('stu-6');
		expect(emiGroup!.memberIds).toContain('stu-7');

		// Hannah (stu-8) and Isaac (stu-9) should be in the same group
		const hannahGroup = scenario.groups.find((g) => g.memberIds.includes('stu-8'));
		expect(hannahGroup).toBeDefined();
		expect(hannahGroup!.memberIds).toContain('stu-9');
	});

	it('should seed preferences correctly', async () => {
		const env = createInMemoryEnvironment();
		const { program } = await createTestFixtures(env);

		const preferences = await env.preferenceRepo.listByProgramId(program.id);

		// Should have 12 preference records (one per student)
		expect(preferences).toHaveLength(12);

		// Each preference should have the correct structure
		for (const pref of preferences) {
			expect(pref.programId).toBe(program.id);
			expect(pref.studentId).toMatch(/^stu-\d+$/);
			expect(pref.payload).toBeDefined();
		}
	});

	it('should be idempotent - calling twice should not create duplicates', async () => {
		const env = createInMemoryEnvironment();

		// Call twice
		await createTestFixtures(env);
		await createTestFixtures(env);

		// Should still have exactly 12 students in the pool
		const pool = await env.poolRepo.getById('pool-test');
		expect(pool?.memberIds).toHaveLength(12);

		// Should still have exactly one program
		const program = await env.programRepo.getById('program-test');
		expect(program).toBeDefined();

		// Should still have exactly 12 preferences
		const preferences = await env.preferenceRepo.listByProgramId('program-test');
		expect(preferences).toHaveLength(12);
	});
});
