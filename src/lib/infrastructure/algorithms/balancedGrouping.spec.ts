import { describe, it, expect, beforeEach } from 'vitest';
import { BalancedGroupingAlgorithm } from './balancedGrouping';
import { InMemoryStudentRepository, InMemoryPreferenceRepository } from '../repositories/inMemory';
import { UuidIdGenerator } from '../services';
import type { Preference, Student, StudentPreference } from '$lib/domain';

describe('BalancedGroupingAlgorithm', () => {
	let studentRepo: InMemoryStudentRepository;
	let preferenceRepo: InMemoryPreferenceRepository;
	let idGenerator: UuidIdGenerator;
	let algorithm: BalancedGroupingAlgorithm;

	beforeEach(() => {
		studentRepo = new InMemoryStudentRepository([]);
		preferenceRepo = new InMemoryPreferenceRepository([]);
		idGenerator = new UuidIdGenerator();
		algorithm = new BalancedGroupingAlgorithm(studentRepo, preferenceRepo, idGenerator);
	});

	it('should generate balanced groups with default group sizes', async () => {
		// Create 12 students (should result in 2-3 groups of 4-6 students)
		const students: Student[] = [];
		for (let i = 1; i <= 12; i++) {
			students.push({
				id: `student-${i}`,
				firstName: `Student${i}`,
				lastName: 'Test',
				gradeLevel: '5'
			});
		}
		await studentRepo.saveMany(students);

		const result = await algorithm.generateGroups({
			programId: 'test-program',
			studentIds: students.map((s) => s.id)
		});

		expect(result.success).toBe(true);
		if (result.success) {
			// Should have 2-3 groups
			expect(result.groups.length).toBeGreaterThanOrEqual(2);
			expect(result.groups.length).toBeLessThanOrEqual(3);

			// All students should be assigned
			const allMemberIds = result.groups.flatMap((g) => g.memberIds);
			expect(allMemberIds).toHaveLength(12);
			expect(new Set(allMemberIds).size).toBe(12); // No duplicates

			// Each group should have 4-6 students
			for (const group of result.groups) {
				expect(group.memberIds.length).toBeGreaterThanOrEqual(4);
				expect(group.memberIds.length).toBeLessThanOrEqual(6);
				expect(group.name).toMatch(/^Group \d+$/);
			}
		}
	});

	it('should distribute students evenly with group preferences', async () => {
		// Create 8 students
		const students: Student[] = [
			{ id: 'alice', firstName: 'Alice', lastName: 'A', gradeLevel: '5' },
			{ id: 'bob', firstName: 'Bob', lastName: 'B', gradeLevel: '5' },
			{ id: 'charlie', firstName: 'Charlie', lastName: 'C', gradeLevel: '5' },
			{ id: 'diana', firstName: 'Diana', lastName: 'D', gradeLevel: '5' },
			{ id: 'eve', firstName: 'Eve', lastName: 'E', gradeLevel: '5' },
			{ id: 'frank', firstName: 'Frank', lastName: 'F', gradeLevel: '5' },
			{ id: 'grace', firstName: 'Grace', lastName: 'G', gradeLevel: '5' },
			{ id: 'henry', firstName: 'Henry', lastName: 'H', gradeLevel: '5' }
		];
		await studentRepo.saveMany(students);

		// Create preferences with group choices
		const preferences: Preference[] = [
			{
				id: 'pref-alice',
				programId: 'test-program',
				studentId: 'alice',
				payload: {
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['group-1'],
					avoidGroupIds: []
				} satisfies StudentPreference
			},
			{
				id: 'pref-bob',
				programId: 'test-program',
				studentId: 'bob',
				payload: {
					studentId: 'bob',
					avoidStudentIds: [],
					likeGroupIds: ['group-2'],
					avoidGroupIds: []
				} satisfies StudentPreference
			}
		];

		await preferenceRepo.setForProgram('test-program', preferences);

		const result = await algorithm.generateGroups({
			programId: 'test-program',
			studentIds: students.map((s) => s.id)
		});

		expect(result.success).toBe(true);
		if (result.success) {
			// All students should be assigned
			const allMemberIds = result.groups.flatMap((g) => g.memberIds);
			expect(allMemberIds).toHaveLength(8);
			expect(new Set(allMemberIds).size).toBe(8); // No duplicates
		}
	});

	it('should handle students with no preferences', async () => {
		const students: Student[] = [
			{ id: 's1', firstName: 'Student', lastName: '1', gradeLevel: '5' },
			{ id: 's2', firstName: 'Student', lastName: '2', gradeLevel: '5' },
			{ id: 's3', firstName: 'Student', lastName: '3', gradeLevel: '5' },
			{ id: 's4', firstName: 'Student', lastName: '4', gradeLevel: '5' }
		];
		await studentRepo.saveMany(students);

		const result = await algorithm.generateGroups({
			programId: 'test-program',
			studentIds: students.map((s) => s.id)
		});

		expect(result.success).toBe(true);
		if (result.success) {
			// Should still create groups and assign all students
			expect(result.groups.length).toBeGreaterThanOrEqual(1);
			const allMemberIds = result.groups.flatMap((g) => g.memberIds);
			expect(allMemberIds).toHaveLength(4);
		}
	});

	it('should use provided group shells when present', async () => {
		const students: Student[] = [];
		for (let i = 1; i <= 6; i++) {
			students.push({ id: `s${i}`, firstName: 'S', lastName: `${i}`, gradeLevel: '5' });
		}
		await studentRepo.saveMany(students);

		const result = await algorithm.generateGroups({
			programId: 'test-program',
			studentIds: students.map((s) => s.id),
			algorithmConfig: {
				groups: [
					{ name: 'Alpha', capacity: 2 },
					{ name: 'Beta', capacity: 2 },
					{ name: 'Gamma', capacity: 2 }
				]
			}
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.groups.map((g) => g.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
			expect(result.groups.every((g) => g.memberIds.length === 2)).toBe(true);
		}
	});

	it('should honor min/max sizes and target group count when auto-generating', async () => {
		const students: Student[] = [];
		for (let i = 1; i <= 25; i++) {
			students.push({ id: `s${i}`, firstName: 'S', lastName: `${i}`, gradeLevel: '5' });
		}
		await studentRepo.saveMany(students);

		const result = await algorithm.generateGroups({
			programId: 'test-program',
			studentIds: students.map((s) => s.id),
			algorithmConfig: {
				targetGroupCount: 4,
				minGroupSize: 5,
				maxGroupSize: 7
			}
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.groups).toHaveLength(4);
			const sizes = result.groups.map((g) => g.memberIds.length);
			expect(Math.min(...sizes)).toBeGreaterThanOrEqual(5);
			expect(Math.max(...sizes)).toBeLessThanOrEqual(7);
			expect(result.groups.flatMap((g) => g.memberIds)).toHaveLength(25);
		}
	});

	it('should return error for empty student list', async () => {
		const result = await algorithm.generateGroups({
			programId: 'test-program',
			studentIds: []
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.message).toContain('No students');
		}
	});

	describe('seed-based variation', () => {
		it('should produce different results with different seeds', async () => {
			// Create enough students to see variation
			const students: Student[] = [];
			for (let i = 1; i <= 20; i++) {
				students.push({
					id: `student-${i}`,
					firstName: `Student${i}`,
					lastName: 'Test',
					gradeLevel: '5'
				});
			}
			await studentRepo.saveMany(students);

			const studentIds = students.map((s) => s.id);

			const result1 = await algorithm.generateGroups({
				programId: 'test-program',
				studentIds,
				algorithmConfig: { seed: 12345 }
			});

			const result2 = await algorithm.generateGroups({
				programId: 'test-program',
				studentIds,
				algorithmConfig: { seed: 67890 }
			});

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);

			if (result1.success && result2.success) {
				// The group assignments should be different
				const group1Members = result1.groups.map((g) => g.memberIds.sort().join(',')).sort();
				const group2Members = result2.groups.map((g) => g.memberIds.sort().join(',')).sort();
				expect(group1Members).not.toEqual(group2Members);
			}
		});

		it('should produce same results with same seed', async () => {
			const students: Student[] = [];
			for (let i = 1; i <= 12; i++) {
				students.push({
					id: `student-${i}`,
					firstName: `Student${i}`,
					lastName: 'Test',
					gradeLevel: '5'
				});
			}
			await studentRepo.saveMany(students);

			const studentIds = students.map((s) => s.id);
			const seed = 42;

			const result1 = await algorithm.generateGroups({
				programId: 'test-program',
				studentIds,
				algorithmConfig: { seed }
			});

			const result2 = await algorithm.generateGroups({
				programId: 'test-program',
				studentIds,
				algorithmConfig: { seed }
			});

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);

			if (result1.success && result2.success) {
				// The group assignments should be identical with same seed
				const group1Members = result1.groups.map((g) => g.memberIds.sort().join(',')).sort();
				const group2Members = result2.groups.map((g) => g.memberIds.sort().join(',')).sort();
				expect(group1Members).toEqual(group2Members);
			}
		});
	});
});
