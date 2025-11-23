import { describe, it, expect } from 'vitest';
import { getCapacityStatus } from './capacity';
import type { Group } from '$lib/types';

describe('getCapacityStatus', () => {
	describe('unlimited capacity (null)', () => {
		it('should return gray color for unlimited capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: null,
				memberIds: ['student-1', 'student-2', 'student-3']
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#6b7280');
			expect(status.isWarning).toBe(false);
			expect(status.isFull).toBe(false);
		});

		it('should return gray even with many members when capacity is null', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: null,
				memberIds: Array.from({ length: 1000 }, (_, i) => `student-${i}`)
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#6b7280');
			expect(status.isWarning).toBe(false);
			expect(status.isFull).toBe(false);
		});

		it('should return gray for empty group with null capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: null,
				memberIds: []
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#6b7280');
			expect(status.isWarning).toBe(false);
			expect(status.isFull).toBe(false);
		});
	});

	describe('under 80% capacity', () => {
		it('should return gray when at 0% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: []
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#6b7280');
			expect(status.isWarning).toBe(false);
			expect(status.isFull).toBe(false);
		});

		it('should return gray when at 50% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: ['s1', 's2', 's3', 's4', 's5']
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#6b7280');
			expect(status.isWarning).toBe(false);
			expect(status.isFull).toBe(false);
		});

		it('should return gray when just under 80% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] // 7/10 = 70%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#6b7280');
			expect(status.isWarning).toBe(false);
			expect(status.isFull).toBe(false);
		});
	});

	describe('80-99% capacity (warning zone)', () => {
		it('should return amber when at exactly 80% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] // 8/10 = 80%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#f59e0b');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(false);
		});

		it('should return amber when at 90% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'] // 9/10 = 90%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#f59e0b');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(false);
		});

		it('should return amber when at 99% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 100,
				memberIds: Array.from({ length: 99 }, (_, i) => `s${i}`) // 99/100 = 99%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#f59e0b');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(false);
		});
	});

	describe('100%+ capacity (full/over)', () => {
		it('should return red when at exactly 100% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: Array.from({ length: 10 }, (_, i) => `s${i}`) // 10/10 = 100%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#dc2626');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(true);
		});

		it('should return red when over capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: Array.from({ length: 12 }, (_, i) => `s${i}`) // 12/10 = 120%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#dc2626');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(true);
		});

		it('should return red when significantly over capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 5,
				memberIds: Array.from({ length: 50 }, (_, i) => `s${i}`) // 50/5 = 1000%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#dc2626');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle capacity of 1', () => {
			const emptyGroup: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 1,
				memberIds: []
			};

			const fullGroup: Group = {
				id: 'group-2',
				name: 'Group 2',
				capacity: 1,
				memberIds: ['s1']
			};

			expect(getCapacityStatus(emptyGroup).color).toBe('#6b7280');
			expect(getCapacityStatus(fullGroup).color).toBe('#dc2626');
			expect(getCapacityStatus(fullGroup).isFull).toBe(true);
		});

		it('should handle very large capacity numbers', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10000,
				memberIds: Array.from({ length: 8000 }, (_, i) => `s${i}`) // 80%
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#f59e0b');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(false);
		});

		it('should handle fractional percentages correctly', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 3,
				memberIds: ['s1', 's2'] // 2/3 = 66.67% (should be gray)
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#6b7280');
			expect(status.isWarning).toBe(false);
		});

		it('should handle boundary at 79.9% vs 80%', () => {
			// Just under 80%
			const groupUnder: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 1000,
				memberIds: Array.from({ length: 799 }, (_, i) => `s${i}`) // 79.9%
			};

			// Exactly 80%
			const groupAt: Group = {
				id: 'group-2',
				name: 'Group 2',
				capacity: 1000,
				memberIds: Array.from({ length: 800 }, (_, i) => `s${i}`) // 80%
			};

			expect(getCapacityStatus(groupUnder).color).toBe('#6b7280');
			expect(getCapacityStatus(groupUnder).isWarning).toBe(false);

			expect(getCapacityStatus(groupAt).color).toBe('#f59e0b');
			expect(getCapacityStatus(groupAt).isWarning).toBe(true);
		});
	});
});
