import { describe, it, expect } from 'vitest';
import { getCapacityStatus } from './groups';
import type { Group } from '$lib/domain';

describe('getCapacityStatus (from groups.ts)', () => {
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
			expect(status.isOverEnrolled).toBe(false);
			expect(status.overEnrollmentCount).toBe(0);
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
			expect(status.isOverEnrolled).toBe(false);
			expect(status.overEnrollmentCount).toBe(0);
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
			expect(status.isOverEnrolled).toBe(false);
			expect(status.overEnrollmentCount).toBe(0);
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
			expect(status.isOverEnrolled).toBe(false);
			expect(status.overEnrollmentCount).toBe(0);
		});
	});

	describe('80-99% capacity (warning zone)', () => {
		it('should return amber when at exactly 80% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#f59e0b');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(false);
			expect(status.isOverEnrolled).toBe(false);
			expect(status.overEnrollmentCount).toBe(0);
		});

		it('should return amber when at 90% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#f59e0b');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(false);
			expect(status.isOverEnrolled).toBe(false);
			expect(status.overEnrollmentCount).toBe(0);
		});
	});

	describe('100% capacity (full)', () => {
		it('should return red when at exactly 100% capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: Array.from({ length: 10 }, (_, i) => `s${i}`)
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#dc2626');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(true);
			expect(status.isOverEnrolled).toBe(false);
			expect(status.overEnrollmentCount).toBe(0);
		});
	});

	describe('over capacity (over-enrolled)', () => {
		it('should return purple when over capacity', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: Array.from({ length: 12 }, (_, i) => `s${i}`)
			};

			const status = getCapacityStatus(group);

			expect(status.color).toBe('#7c3aed');
			expect(status.isWarning).toBe(true);
			expect(status.isFull).toBe(true);
			expect(status.isOverEnrolled).toBe(true);
			expect(status.overEnrollmentCount).toBe(2);
		});

		it('should return correct over-enrollment count', () => {
			const group: Group = {
				id: 'group-1',
				name: 'Group 1',
				capacity: 5,
				memberIds: Array.from({ length: 8 }, (_, i) => `s${i}`)
			};

			const status = getCapacityStatus(group);

			expect(status.isOverEnrolled).toBe(true);
			expect(status.overEnrollmentCount).toBe(3);
		});
	});
});
