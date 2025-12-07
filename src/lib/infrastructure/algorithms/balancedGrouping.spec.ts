import { describe, it, expect, beforeEach } from 'vitest';
import { BalancedGroupingAlgorithm } from './balancedGrouping';
import { InMemoryStudentRepository, InMemoryPreferenceRepository } from '../repositories/inMemory';
import { UuidIdGenerator } from '../services';
import type { Student, Group, StudentPreference, Preference } from '$lib/domain';

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

	it('should respect mutual friend preferences', async () => {
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

		// Create preferences: Alice <-> Bob mutual friends
		const preferences: Preference[] = [
			{
				id: 'pref-alice',
				programId: 'test-program',
				studentId: 'alice',
				payload: {
					studentId: 'alice',
					likeStudentIds: ['bob'],
					avoidStudentIds: [],
					likeGroupIds: [],
					avoidGroupIds: []
				} satisfies StudentPreference
			},
			{
				id: 'pref-bob',
				programId: 'test-program',
				studentId: 'bob',
				payload: {
					studentId: 'bob',
					likeStudentIds: ['alice'],
					avoidStudentIds: [],
					likeGroupIds: [],
					avoidGroupIds: []
				} satisfies StudentPreference
			}
		];

		preferenceRepo.setForProgram('test-program', preferences);

		const result = await algorithm.generateGroups({
			programId: 'test-program',
			studentIds: students.map((s) => s.id)
		});

		expect(result.success).toBe(true);
		if (result.success) {
			// Find which group Alice is in
			const aliceGroup = result.groups.find((g) => g.memberIds.includes('alice'));
			expect(aliceGroup).toBeDefined();

			// Bob should be in the same group as Alice (mutual friends)
			expect(aliceGroup!.memberIds).toContain('bob');
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
});
