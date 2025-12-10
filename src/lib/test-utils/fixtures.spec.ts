import { describe, it, expect } from 'vitest';
import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import { createTestFixtures } from './fixtures';
import { generateScenarioForProgram } from '$lib/application/useCases/generateScenario';

describe('Test Fixtures with Balanced Grouping', () => {
	describe('Medium Dataset (default)', () => {
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

		it('should include predefined groups', async () => {
			const env = createInMemoryEnvironment();
			const { groups } = await createTestFixtures(env, 'medium');

			expect(groups).toHaveLength(3);
			expect(groups[0].name).toBe('Group Alpha');
			expect(groups[1].name).toBe('Group Beta');
			expect(groups[2].name).toBe('Group Gamma');
			expect(groups[0].capacity).toBe(4);
		});

		it('should include group preferences', async () => {
			const env = createInMemoryEnvironment();
			const { preferences } = await createTestFixtures(env, 'medium');

			const lunaPrefs = preferences.find((p) => p.studentId === 'stu-12');
			expect(lunaPrefs?.payload.likeGroupIds).toContain('grp-1'); // Luna wants Group Alpha

			const isaacPrefs = preferences.find((p) => p.studentId === 'stu-9');
			expect(isaacPrefs?.payload.avoidGroupIds).toContain('grp-3'); // Isaac avoids Group Gamma
		});

		it('should include avoidance preferences', async () => {
			const env = createInMemoryEnvironment();
			const { preferences } = await createTestFixtures(env, 'medium');

			const alicePrefs = preferences.find((p) => p.studentId === 'stu-1');
			expect(alicePrefs?.payload.avoidStudentIds).toContain('stu-4'); // Alice avoids Diego

			const kevinPrefs = preferences.find((p) => p.studentId === 'stu-11');
			expect(kevinPrefs?.payload.avoidStudentIds).toContain('stu-2'); // Kevin avoids Brandon
		});
	});

	describe('Small Dataset', () => {
		it('should create small dataset with 8 students', async () => {
			const env = createInMemoryEnvironment();
			const { students, pool, groups, preferences } = await createTestFixtures(
				env,
				'small'
			);

			expect(students).toHaveLength(8);
			expect(pool.memberIds).toHaveLength(8);
			expect(groups).toHaveLength(2);
			expect(preferences).toHaveLength(8);
			expect(students[0].gradeLevel).toBe('3');
		});

		it('should include group preferences in small dataset', async () => {
			const env = createInMemoryEnvironment();
			const { preferences } = await createTestFixtures(env, 'small');

			const grayPrefs = preferences.find((p) => p.studentId === 'stu-s7');
			expect(grayPrefs?.payload.likeGroupIds).toContain('grp-s1'); // Gray wants Red Team

			const harperPrefs = preferences.find((p) => p.studentId === 'stu-s8');
			expect(harperPrefs?.payload.avoidGroupIds).toContain('grp-s2'); // Harper avoids Blue Team
		});
	});

	describe('Large Dataset', () => {
		it('should create large dataset with 20 students', async () => {
			const env = createInMemoryEnvironment();
			const { students, pool, groups, preferences } = await createTestFixtures(
				env,
				'large'
			);

			expect(students).toHaveLength(20);
			expect(pool.memberIds).toHaveLength(20);
			expect(groups).toHaveLength(4);
			expect(preferences).toHaveLength(20);
			expect(students[0].gradeLevel).toBe('7');
		});

		it('should include complex preferences in large dataset', async () => {
			const env = createInMemoryEnvironment();
			const { preferences } = await createTestFixtures(env, 'large');

			// Triangle: Aiden ↔ Bella ↔ Carter
			const aidenPrefs = preferences.find((p) => p.studentId === 'stu-l1');
			expect(aidenPrefs?.payload.likeStudentIds).toContain('stu-l2');
			expect(aidenPrefs?.payload.likeStudentIds).toContain('stu-l3');
			expect(aidenPrefs?.payload.avoidStudentIds).toContain('stu-l4'); // Avoids Dylan

			// Group preferences
			const owenPrefs = preferences.find((p) => p.studentId === 'stu-l15');
			expect(owenPrefs?.payload.likeGroupIds).toContain('grp-l1'); // Owen wants Eagles

			const quinnPrefs = preferences.find((p) => p.studentId === 'stu-l17');
			expect(quinnPrefs?.payload.avoidGroupIds).toContain('grp-l3'); // Quinn avoids Falcons
		});

		it('should generate balanced groups for large dataset', async () => {
			const env = createInMemoryEnvironment();
			const { program } = await createTestFixtures(env, 'large');

			const result = await generateScenarioForProgram(env, {
				programId: program.id,
				createdByStaffId: 'owner-1'
			});

			expect(result.status).toBe('ok');
			if (result.status !== 'ok') return;

			const scenario = result.value;

			// Should have 20 students
			expect(scenario.participantSnapshot).toHaveLength(20);

			// All students should be assigned
			const allMemberIds = scenario.groups.flatMap((g) => g.memberIds);
			expect(allMemberIds).toHaveLength(20);
			expect(new Set(allMemberIds).size).toBe(20); // No duplicates
		});
	});

	describe('Dataset Compatibility', () => {
		it('should seed preferences correctly for medium dataset', async () => {
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

		it('should support multiple datasets in same environment', async () => {
			const env = createInMemoryEnvironment();

			// Create all three datasets
			const small = await createTestFixtures(env, 'small');
			const medium = await createTestFixtures(env, 'medium');
			const large = await createTestFixtures(env, 'large');

			// Verify each dataset is independent
			expect(small.program.id).not.toBe(medium.program.id);
			expect(medium.program.id).not.toBe(large.program.id);

			expect(small.students).toHaveLength(8);
			expect(medium.students).toHaveLength(12);
			expect(large.students).toHaveLength(20);

			// Verify all datasets exist in the environment
			const smallProgram = await env.programRepo.getById(small.program.id);
			const mediumProgram = await env.programRepo.getById(medium.program.id);
			const largeProgram = await env.programRepo.getById(large.program.id);

			expect(smallProgram).toBeDefined();
			expect(mediumProgram).toBeDefined();
			expect(largeProgram).toBeDefined();
		});
	});
});
