import { describe, it, expect } from 'vitest';
import { createProgram } from './program';
import type { ProgramType } from './program';

describe('createProgram', () => {
	describe('success cases', () => {
		it('should create a program with required fields', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Summer Camp',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1']
			});

			expect(program.id).toBe('program-1');
			expect(program.name).toBe('Summer Camp');
			expect(program.type).toBe('CLUBS');
			expect(program.timeSpan).toEqual({ termLabel: 'Summer 2024' });
			expect(program.poolIds).toEqual(['pool-1']);
		});

		it('should create a program with all optional fields', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Advisory Program',
				type: 'ADVISORY',
				timeSpan: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
				poolIds: ['pool-1', 'pool-2'],
				schoolId: 'school-123',
				primaryPoolId: 'pool-1',
				ownerStaffIds: ['staff-1', 'staff-2']
			});

			expect(program.schoolId).toBe('school-123');
			expect(program.primaryPoolId).toBe('pool-1');
			expect(program.ownerStaffIds).toEqual(['staff-1', 'staff-2']);
		});

		it('should handle all program types', () => {
			const types: ProgramType[] = ['CLUBS', 'ADVISORY', 'CABINS', 'CLASS_ACTIVITY', 'OTHER'];

			for (const type of types) {
				const program = createProgram({
					id: `program-${type}`,
					name: `Program ${type}`,
					type,
					timeSpan: { termLabel: 'Fall 2024' },
					poolIds: ['pool-1']
				});

				expect(program.type).toBe(type);
			}
		});

		it('should handle timeSpan with termLabel', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Spring 2024' },
				poolIds: ['pool-1']
			});

			expect(program.timeSpan).toEqual({ termLabel: 'Spring 2024' });
		});

		it('should handle timeSpan with date range', () => {
			const timeSpan = {
				start: new Date('2024-01-01'),
				end: new Date('2024-12-31')
			};

			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan,
				poolIds: ['pool-1']
			});

			expect(program.timeSpan).toEqual(timeSpan);
		});

		it('should handle multiple poolIds', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Multi-Pool Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1', 'pool-2', 'pool-3']
			});

			expect(program.poolIds).toEqual(['pool-1', 'pool-2', 'pool-3']);
		});
	});

	describe('validation failures', () => {
		it('should throw error when name is empty', () => {
			expect(() => {
				createProgram({
					id: 'program-1',
					name: '',
					type: 'CLUBS',
					timeSpan: { termLabel: 'Summer 2024' },
					poolIds: ['pool-1']
				});
			}).toThrow('Program name must not be empty');
		});

		it('should throw error when name is only whitespace', () => {
			expect(() => {
				createProgram({
					id: 'program-1',
					name: '   ',
					type: 'CLUBS',
					timeSpan: { termLabel: 'Summer 2024' },
					poolIds: ['pool-1']
				});
			}).toThrow('Program name must not be empty');
		});

		it('should throw error when poolIds is empty', () => {
			expect(() => {
				createProgram({
					id: 'program-1',
					name: 'Test Program',
					type: 'CLUBS',
					timeSpan: { termLabel: 'Summer 2024' },
					poolIds: []
				});
			}).toThrow('Program must reference at least one pool (poolIds non-empty)');
		});

		it('should throw error when primaryPoolId is not in poolIds', () => {
			expect(() => {
				createProgram({
					id: 'program-1',
					name: 'Test Program',
					type: 'CLUBS',
					timeSpan: { termLabel: 'Summer 2024' },
					poolIds: ['pool-1', 'pool-2'],
					primaryPoolId: 'pool-3'
				});
			}).toThrow('primaryPoolId must be included in poolIds');
		});
	});

	describe('name trimming', () => {
		it('should trim leading and trailing whitespace from name', () => {
			const program = createProgram({
				id: 'program-1',
				name: '  Summer Camp  ',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1']
			});

			expect(program.name).toBe('Summer Camp');
		});

		it('should preserve internal whitespace in name', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Summer   Camp   2024',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1']
			});

			expect(program.name).toBe('Summer   Camp   2024');
		});
	});

	describe('primaryPoolId validation', () => {
		it('should allow primaryPoolId when it is in poolIds', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1', 'pool-2', 'pool-3'],
				primaryPoolId: 'pool-2'
			});

			expect(program.primaryPoolId).toBe('pool-2');
		});

		it('should allow undefined primaryPoolId', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1']
			});

			expect(program.primaryPoolId).toBeUndefined();
		});

		it('should allow primaryPoolId as the only pool in poolIds', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1'],
				primaryPoolId: 'pool-1'
			});

			expect(program.primaryPoolId).toBe('pool-1');
			expect(program.poolIds).toEqual(['pool-1']);
		});
	});

	describe('data immutability', () => {
		it('should create a new array for poolIds', () => {
			const originalPoolIds = ['pool-1', 'pool-2'];
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: originalPoolIds
			});

			program.poolIds.push('pool-3');
			expect(originalPoolIds).toHaveLength(2);
			expect(program.poolIds).toHaveLength(3);
		});

		it('should share reference with original ownerStaffIds array', () => {
			const originalOwnerStaffIds = ['staff-1', 'staff-2'];
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1'],
				ownerStaffIds: originalOwnerStaffIds
			});

			// The factory doesn't copy ownerStaffIds, so they share the same reference
			expect(program.ownerStaffIds).toBe(originalOwnerStaffIds);
		});
	});

	describe('edge cases', () => {
		it('should handle very long program names', () => {
			const longName = 'A'.repeat(1000);
			const program = createProgram({
				id: 'program-1',
				name: longName,
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1']
			});

			expect(program.name).toBe(longName);
		});

		it('should handle large number of poolIds', () => {
			const poolIds = Array.from({ length: 100 }, (_, i) => `pool-${i}`);
			const program = createProgram({
				id: 'program-1',
				name: 'Large Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds
			});

			expect(program.poolIds).toHaveLength(100);
		});

		it('should handle special characters in name', () => {
			const program = createProgram({
				id: 'program-1',
				name: "Mr. O'Brien's Summer Camp (2024) - Grade 10",
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1']
			});

			expect(program.name).toBe("Mr. O'Brien's Summer Camp (2024) - Grade 10");
		});

		it('should handle unicode characters in name', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'サマーキャンプ 2024 🏕️',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1']
			});

			expect(program.name).toBe('サマーキャンプ 2024 🏕️');
		});

		it('should handle multiple owner staff IDs', () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1'],
				ownerStaffIds: ['staff-1', 'staff-2', 'staff-3', 'staff-4']
			});

			expect(program.ownerStaffIds).toHaveLength(4);
		});
	});
});
