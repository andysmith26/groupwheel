import { describe, it, expect } from 'vitest';
import { createGroup } from './group';

describe('createGroup', () => {
	describe('success cases', () => {
		it('should create a group with required fields', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1'
			});

			expect(group.id).toBe('group-1');
			expect(group.name).toBe('Group 1');
			expect(group.capacity).toBeNull();
			expect(group.memberIds).toEqual([]);
			expect(group.leaderStaffId).toBeUndefined();
		});

		it('should create a group with all optional fields', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: 10,
				memberIds: ['s1', 's2', 's3'],
				leaderStaffId: 'staff-1'
			});

			expect(group.capacity).toBe(10);
			expect(group.memberIds).toEqual(['s1', 's2', 's3']);
			expect(group.leaderStaffId).toBe('staff-1');
		});

		it('should default capacity to null when not provided', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1'
			});

			expect(group.capacity).toBeNull();
		});

		it('should default memberIds to empty array when not provided', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1'
			});

			expect(group.memberIds).toEqual([]);
		});

		it('should handle capacity of 0', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: 0
			});

			expect(group.capacity).toBe(0);
		});

		it('should handle large capacity values', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: 1000000
			});

			expect(group.capacity).toBe(1000000);
		});

		it('should remove duplicate member IDs', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				memberIds: ['s1', 's2', 's1', 's3', 's2']
			});

			expect(group.memberIds).toEqual(['s1', 's2', 's3']);
			expect(group.memberIds).toHaveLength(3);
		});

		it('should handle explicit null capacity', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: null
			});

			expect(group.capacity).toBeNull();
		});
	});

	describe('validation failures', () => {
		it('should throw error when name is empty', () => {
			expect(() => {
				createGroup({
					id: 'group-1',
					name: ''
				});
			}).toThrow('Group name must not be empty');
		});

		it('should throw error when name is only whitespace', () => {
			expect(() => {
				createGroup({
					id: 'group-1',
					name: '   '
				});
			}).toThrow('Group name must not be empty');
		});
	});

	describe('name trimming', () => {
		it('should trim leading and trailing whitespace from name', () => {
			const group = createGroup({
				id: 'group-1',
				name: '  Group 1  '
			});

			expect(group.name).toBe('Group 1');
		});

		it('should preserve internal whitespace in name', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group   1   Alpha'
			});

			expect(group.name).toBe('Group   1   Alpha');
		});
	});

	describe('capacity normalization', () => {
		it('should convert Infinity to null', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: Infinity
			});

			expect(group.capacity).toBeNull();
		});

		it('should convert -Infinity to null', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: -Infinity
			});

			expect(group.capacity).toBeNull();
		});

		it('should convert NaN to null', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: NaN
			});

			expect(group.capacity).toBeNull();
		});

		it('should handle negative capacity by treating it as a valid number', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: -5
			});

			expect(group.capacity).toBe(-5);
		});
	});

	describe('data immutability', () => {
		it('should create a new array for memberIds', () => {
			const originalMemberIds = ['s1', 's2'];
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				memberIds: originalMemberIds
			});

			group.memberIds.push('s3');
			expect(originalMemberIds).toHaveLength(2);
			expect(group.memberIds).toHaveLength(3);
		});
	});

	describe('edge cases', () => {
		it('should handle very long group names', () => {
			const longName = 'A'.repeat(1000);
			const group = createGroup({
				id: 'group-1',
				name: longName
			});

			expect(group.name).toBe(longName);
		});

		it('should handle large number of member IDs', () => {
			const memberIds = Array.from({ length: 1000 }, (_, i) => `s${i}`);
			const group = createGroup({
				id: 'group-1',
				name: 'Large Group',
				memberIds
			});

			expect(group.memberIds).toHaveLength(1000);
		});

		it('should handle special characters in name', () => {
			const group = createGroup({
				id: 'group-1',
				name: "Mr. O'Brien's Group (2024) - Alpha Team"
			});

			expect(group.name).toBe("Mr. O'Brien's Group (2024) - Alpha Team");
		});

		it('should handle unicode characters in name', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'グループ 1 🏆'
			});

			expect(group.name).toBe('グループ 1 🏆');
		});

		it('should handle empty memberIds array explicitly', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				memberIds: []
			});

			expect(group.memberIds).toEqual([]);
		});

		it('should handle capacity as decimal (though unusual)', () => {
			const group = createGroup({
				id: 'group-1',
				name: 'Group 1',
				capacity: 5.5
			});

			expect(group.capacity).toBe(5.5);
		});
	});
});
