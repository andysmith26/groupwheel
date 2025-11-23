import { describe, it, expect } from 'vitest';
import { createPool } from './pool';
import type { PoolType } from './pool';

describe('createPool', () => {
	describe('success cases', () => {
		it('should create a pool with required fields', () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Grade 10',
				type: 'GRADE',
				memberIds: ['student-1', 'student-2']
			});

			expect(pool.id).toBe('pool-1');
			expect(pool.name).toBe('Grade 10');
			expect(pool.type).toBe('GRADE');
			expect(pool.memberIds).toEqual(['student-1', 'student-2']);
			expect(pool.status).toBe('ACTIVE'); // default status
		});

		it('should create a pool with all optional fields', () => {
			const timeSpan = {
				start: new Date('2024-01-01'),
				end: new Date('2024-12-31')
			};

			const pool = createPool({
				id: 'pool-1',
				name: 'Summer Camp',
				type: 'CUSTOM',
				memberIds: ['student-1'],
				schoolId: 'school-123',
				primaryStaffOwnerId: 'staff-1',
				ownerStaffIds: ['staff-1', 'staff-2'],
				timeSpan,
				status: 'ARCHIVED',
				source: 'IMPORT',
				parentPoolId: 'parent-pool-1'
			});

			expect(pool.schoolId).toBe('school-123');
			expect(pool.primaryStaffOwnerId).toBe('staff-1');
			expect(pool.ownerStaffIds).toEqual(['staff-1', 'staff-2']);
			expect(pool.timeSpan).toEqual(timeSpan);
			expect(pool.status).toBe('ARCHIVED');
			expect(pool.source).toBe('IMPORT');
			expect(pool.parentPoolId).toBe('parent-pool-1');
		});

		it('should default status to ACTIVE when not provided', () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Test Pool',
				type: 'GRADE',
				memberIds: []
			});

			expect(pool.status).toBe('ACTIVE');
		});

		it('should handle all pool types', () => {
			const types: PoolType[] = ['SCHOOL', 'GRADE', 'CLASS', 'TRIP', 'CUSTOM'];

			for (const type of types) {
				const pool = createPool({
					id: `pool-${type}`,
					name: `Pool ${type}`,
					type,
					memberIds: []
				});

				expect(pool.type).toBe(type);
			}
		});

		it('should handle empty member IDs array', () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Empty Pool',
				type: 'GRADE',
				memberIds: []
			});

			expect(pool.memberIds).toEqual([]);
		});

		it('should remove duplicate member IDs', () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Test Pool',
				type: 'GRADE',
				memberIds: ['student-1', 'student-2', 'student-1', 'student-3', 'student-2']
			});

			expect(pool.memberIds).toEqual(['student-1', 'student-2', 'student-3']);
			expect(pool.memberIds).toHaveLength(3);
		});

		it('should handle timeSpan with only start date', () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Test Pool',
				type: 'TRIP',
				memberIds: [],
				timeSpan: {
					start: new Date('2024-06-01')
				}
			});

			expect(pool.timeSpan?.start).toEqual(new Date('2024-06-01'));
			expect(pool.timeSpan?.end).toBeUndefined();
		});

		it('should handle timeSpan with both start and end dates', () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Test Pool',
				type: 'TRIP',
				memberIds: [],
				timeSpan: {
					start: new Date('2024-06-01'),
					end: new Date('2024-08-31')
				}
			});

			expect(pool.timeSpan?.start).toEqual(new Date('2024-06-01'));
			expect(pool.timeSpan?.end).toEqual(new Date('2024-08-31'));
		});
	});

	describe('validation failures', () => {
		it('should throw error when name is empty', () => {
			expect(() => {
				createPool({
					id: 'pool-1',
					name: '',
					type: 'GRADE',
					memberIds: []
				});
			}).toThrow('Pool name must not be empty');
		});

		it('should throw error when name is only whitespace', () => {
			expect(() => {
				createPool({
					id: 'pool-1',
					name: '   ',
					type: 'GRADE',
					memberIds: []
				});
			}).toThrow('Pool name must not be empty');
		});
	});

	describe('name trimming', () => {
		it('should trim leading and trailing whitespace from name', () => {
			const pool = createPool({
				id: 'pool-1',
				name: '  Grade 10  ',
				type: 'GRADE',
				memberIds: []
			});

			expect(pool.name).toBe('Grade 10');
		});

		it('should preserve internal whitespace in name', () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Summer   Camp   2024',
				type: 'CUSTOM',
				memberIds: []
			});

			expect(pool.name).toBe('Summer   Camp   2024');
		});
	});

	describe('data immutability', () => {
		it('should create a new array for memberIds', () => {
			const originalMemberIds = ['student-1', 'student-2'];
			const pool = createPool({
				id: 'pool-1',
				name: 'Test Pool',
				type: 'GRADE',
				memberIds: originalMemberIds
			});

			pool.memberIds.push('student-3');
			expect(originalMemberIds).toHaveLength(2);
			expect(pool.memberIds).toHaveLength(3);
		});
	});

	describe('edge cases', () => {
		it('should handle very long pool names', () => {
			const longName = 'A'.repeat(1000);
			const pool = createPool({
				id: 'pool-1',
				name: longName,
				type: 'GRADE',
				memberIds: []
			});

			expect(pool.name).toBe(longName);
		});

		it('should handle large number of member IDs', () => {
			const memberIds = Array.from({ length: 1000 }, (_, i) => `student-${i}`);
			const pool = createPool({
				id: 'pool-1',
				name: 'Large Pool',
				type: 'SCHOOL',
				memberIds
			});

			expect(pool.memberIds).toHaveLength(1000);
		});

		it('should handle special characters in name', () => {
			const pool = createPool({
				id: 'pool-1',
				name: "Grade 10 - Mr. O'Brien's Class (2024)",
				type: 'CLASS',
				memberIds: []
			});

			expect(pool.name).toBe("Grade 10 - Mr. O'Brien's Class (2024)");
		});

		it('should handle unicode characters in name', () => {
			const pool = createPool({
				id: 'pool-1',
				name: '数学クラス 2024 🎓',
				type: 'CLASS',
				memberIds: []
			});

			expect(pool.name).toBe('数学クラス 2024 🎓');
		});
	});
});
