import { describe, it, expect } from 'vitest';
import { createScenario } from './scenario';
import { createGroup } from './group';
import type { Group } from './group';

describe('createScenario', () => {
	describe('success cases', () => {
		it('should create a scenario with required fields', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1', 's2']
				}),
				createGroup({
					id: 'g2',
					name: 'Group 2',
					memberIds: ['s3', 's4']
				})
			];

			const createdAt = new Date('2024-01-01');
			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1', 's2', 's3', 's4'],
				createdAt
			});

			expect(scenario.id).toBe('scenario-1');
			expect(scenario.programId).toBe('program-1');
			expect(scenario.status).toBe('DRAFT');
			expect(scenario.groups).toHaveLength(2);
			expect(scenario.participantSnapshot).toEqual(['s1', 's2', 's3', 's4']);
			expect(scenario.createdAt).toEqual(createdAt);
		});

		it('should initialize lastModifiedAt to createdAt', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1']
				})
			];

			const createdAt = new Date('2024-06-15T10:30:00Z');
			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1'],
				createdAt
			});

			expect(scenario.lastModifiedAt).toEqual(createdAt);
		});

		it('should create a scenario with optional fields', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1']
				})
			];

			const algorithmConfig = { algorithm: 'balanced', seed: 42 };
			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1', 's2'],
				createdAt: new Date(),
				createdByStaffId: 'staff-1',
				algorithmConfig
			});

			expect(scenario.createdByStaffId).toBe('staff-1');
			expect(scenario.algorithmConfig).toEqual(algorithmConfig);
		});

		it('should deduplicate participant IDs', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1']
				})
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1', 's2', 's1', 's3', 's2'],
				createdAt: new Date()
			});

			expect(scenario.participantSnapshot).toHaveLength(3);
			expect(new Set(scenario.participantSnapshot).size).toBe(3);
		});

		it('should handle empty groups array', () => {
			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups: [],
				participantIds: ['s1', 's2'],
				createdAt: new Date()
			});

			expect(scenario.groups).toEqual([]);
		});

		it('should handle scenario with unassigned participants', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1', 's2']
				})
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1', 's2', 's3', 's4'], // s3, s4 unassigned
				createdAt: new Date()
			});

			expect(scenario.participantSnapshot).toHaveLength(4);
			expect(scenario.groups[0].memberIds).toEqual(['s1', 's2']);
		});

		it('should create immutable copies of group memberIds', () => {
			const originalGroups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1', 's2']
				})
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups: originalGroups,
				participantIds: ['s1', 's2'],
				createdAt: new Date()
			});

			// Mutate the scenario's group
			scenario.groups[0].memberIds.push('s3');

			// Original should not be affected
			expect(originalGroups[0].memberIds).toEqual(['s1', 's2']);
			expect(scenario.groups[0].memberIds).toEqual(['s1', 's2', 's3']);
		});
	});

	describe('validation failures', () => {
		it('should throw error when group member is not in participant snapshot', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1', 's2', 's99'] // s99 not in participants
				})
			];

			expect(() => {
				createScenario({
					id: 'scenario-1',
					programId: 'program-1',
					groups,
					participantIds: ['s1', 's2'],
					createdAt: new Date()
				});
			}).toThrow('Group member s99 is not in participant snapshot for program program-1');
		});

		it('should throw error when any group has invalid member', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1', 's2']
				}),
				createGroup({
					id: 'g2',
					name: 'Group 2',
					memberIds: ['s3', 's99'] // s99 not in participants
				})
			];

			expect(() => {
				createScenario({
					id: 'scenario-1',
					programId: 'program-1',
					groups,
					participantIds: ['s1', 's2', 's3'],
					createdAt: new Date()
				});
			}).toThrow('Group member s99 is not in participant snapshot for program program-1');
		});
	});

	describe('status initialization', () => {
		it('should always initialize status as DRAFT', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1']
				})
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1'],
				createdAt: new Date()
			});

			expect(scenario.status).toBe('DRAFT');
		});
	});

	describe('edge cases', () => {
		it('should handle large number of participants', () => {
			const participantIds = Array.from({ length: 1000 }, (_, i) => `s${i}`);
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Large Group',
					memberIds: participantIds.slice(0, 500)
				}),
				createGroup({
					id: 'g2',
					name: 'Large Group 2',
					memberIds: participantIds.slice(500, 1000)
				})
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds,
				createdAt: new Date()
			});

			expect(scenario.participantSnapshot).toHaveLength(1000);
		});

		it('should handle complex algorithm config', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['s1']
				})
			];

			const complexConfig = {
				algorithm: 'balanced',
				weights: {
					friendship: 0.7,
					gender: 0.3
				},
				constraints: ['max-friends', 'gender-balance'],
				seed: 12345
			};

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1', 's2'],
				createdAt: new Date(),
				algorithmConfig: complexConfig
			});

			expect(scenario.algorithmConfig).toEqual(complexConfig);
		});

		it('should handle groups with null capacity', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Unlimited Group',
					capacity: null,
					memberIds: ['s1', 's2', 's3']
				})
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1', 's2', 's3'],
				createdAt: new Date()
			});

			expect(scenario.groups[0].capacity).toBeNull();
		});

		it('should handle empty participant IDs', () => {
			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups: [],
				participantIds: [],
				createdAt: new Date()
			});

			expect(scenario.participantSnapshot).toEqual([]);
		});

		it('should preserve group order', () => {
			const groups: Group[] = [
				createGroup({ id: 'g3', name: 'Group 3', memberIds: ['s3'] }),
				createGroup({ id: 'g1', name: 'Group 1', memberIds: ['s1'] }),
				createGroup({ id: 'g2', name: 'Group 2', memberIds: ['s2'] })
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['s1', 's2', 's3'],
				createdAt: new Date()
			});

			expect(scenario.groups.map((g) => g.id)).toEqual(['g3', 'g1', 'g2']);
		});

		it('should handle participants with special characters in IDs', () => {
			const groups: Group[] = [
				createGroup({
					id: 'g1',
					name: 'Group 1',
					memberIds: ['student@example.com', 'student-123']
				})
			];

			const scenario = createScenario({
				id: 'scenario-1',
				programId: 'program-1',
				groups,
				participantIds: ['student@example.com', 'student-123'],
				createdAt: new Date()
			});

			expect(scenario.participantSnapshot).toContain('student@example.com');
			expect(scenario.participantSnapshot).toContain('student-123');
		});
	});
});
