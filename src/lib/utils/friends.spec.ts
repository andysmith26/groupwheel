import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDisplayName, resolveFriendNames, getFriendLocations } from './friends';
import type { Student, Group } from '$lib/domain';

describe('getDisplayName', () => {
	it('should return firstName + lastName when both are present', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: 'Doe'
		};

		expect(getDisplayName(student)).toBe('John Doe');
	});

	it('should return just firstName when lastName is missing', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John'
		};

		expect(getDisplayName(student)).toBe('John');
	});

	it('should return just lastName when firstName is missing', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			lastName: 'Doe'
		};

		expect(getDisplayName(student)).toBe('Doe');
	});

	it('should fall back to meta.displayName when firstName and lastName are missing', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			meta: { displayName: 'Johnny' }
		};

		expect(getDisplayName(student)).toBe('Johnny');
	});

	it('should fall back to id when all names are missing', () => {
		const student: Student = {
			id: 'student-1',
			firstName: ''
		};

		expect(getDisplayName(student)).toBe('student-1');
	});

	it('should ignore meta.displayName when firstName or lastName exists', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: 'Doe',
			meta: { displayName: 'Johnny' }
		};

		expect(getDisplayName(student)).toBe('John Doe');
	});

	it('should handle empty strings for firstName and lastName', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			lastName: '',
			meta: { displayName: 'Johnny' }
		};

		expect(getDisplayName(student)).toBe('Johnny');
	});

	it('should trim whitespace from combined name', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '  John  ',
			lastName: '  Doe  '
		};

		expect(getDisplayName(student)).toBe('John     Doe');
	});

	it('should handle non-string meta.displayName', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			meta: { displayName: 123 }
		};

		expect(getDisplayName(student)).toBe('student-1');
	});

	it('should handle undefined meta', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			meta: undefined
		};

		expect(getDisplayName(student)).toBe('student-1');
	});
});

describe('resolveFriendNames', () => {
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
	});

	it('should resolve friend names from studentsById', () => {
		const studentsById: Record<string, Student> = {
			s1: { id: 's1', firstName: 'Alice', lastName: 'Smith' },
			s2: { id: 's2', firstName: 'Bob', lastName: 'Jones' },
			s3: { id: 's3', firstName: 'Charlie', lastName: 'Brown' }
		};

		const friendIds = ['s1', 's2', 's3'];
		const result = resolveFriendNames(friendIds, studentsById);

		expect(result).toEqual([
			{ id: 's1', name: 'Alice Smith' },
			{ id: 's2', name: 'Bob Jones' },
			{ id: 's3', name: 'Charlie Brown' }
		]);
	});

	it('should handle empty friendIds array', () => {
		const studentsById: Record<string, Student> = {};
		const friendIds: string[] = [];
		const result = resolveFriendNames(friendIds, studentsById);

		expect(result).toEqual([]);
	});

	it('should return fallback name for missing student', () => {
		const studentsById: Record<string, Student> = {
			s1: { id: 's1', firstName: 'Alice', lastName: 'Smith' }
		};

		const friendIds = ['s1', 's999'];
		const result = resolveFriendNames(friendIds, studentsById);

		expect(result).toEqual([
			{ id: 's1', name: 'Alice Smith' },
			{ id: 's999', name: 'Unknown (s999)' }
		]);
	});

	it('should log warning for missing student', () => {
		const studentsById: Record<string, Student> = {};
		const friendIds = ['missing-student'];

		resolveFriendNames(friendIds, studentsById);

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'Friend ID "missing-student" not found in studentsById. Data may be corrupted.'
		);
	});

	it('should handle multiple missing students', () => {
		const studentsById: Record<string, Student> = {
			s1: { id: 's1', firstName: 'Alice' }
		};

		const friendIds = ['s1', 's2', 's3'];
		const result = resolveFriendNames(friendIds, studentsById);

		expect(result).toEqual([
			{ id: 's1', name: 'Alice' },
			{ id: 's2', name: 'Unknown (s2)' },
			{ id: 's3', name: 'Unknown (s3)' }
		]);
		expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
	});

	it('should use display name fallback logic for found students', () => {
		const studentsById: Record<string, Student> = {
			s1: { id: 's1', firstName: '', meta: { displayName: 'Ace' } },
			s2: { id: 's2', firstName: '' }
		};

		const friendIds = ['s1', 's2'];
		const result = resolveFriendNames(friendIds, studentsById);

		expect(result).toEqual([
			{ id: 's1', name: 'Ace' },
			{ id: 's2', name: 's2' }
		]);
	});
});

describe('getFriendLocations', () => {
	it('should find friends in their respective groups', () => {
		const groups: Group[] = [
			{
				id: 'g1',
				name: 'Group 1',
				capacity: 5,
				memberIds: ['s1', 's2', 's3']
			},
			{
				id: 'g2',
				name: 'Group 2',
				capacity: 5,
				memberIds: ['s4', 's5']
			}
		];

		const friendIds = ['s1', 's4'];
		const result = getFriendLocations(friendIds, groups);

		expect(result).toEqual([
			{ friendId: 's1', groupId: 'g1', groupName: 'Group 1' },
			{ friendId: 's4', groupId: 'g2', groupName: 'Group 2' }
		]);
	});

	it('should mark friends as unassigned when not in any group', () => {
		const groups: Group[] = [
			{
				id: 'g1',
				name: 'Group 1',
				capacity: 5,
				memberIds: ['s1', 's2']
			}
		];

		const friendIds = ['s1', 's99'];
		const result = getFriendLocations(friendIds, groups);

		expect(result).toEqual([
			{ friendId: 's1', groupId: 'g1', groupName: 'Group 1' },
			{ friendId: 's99', groupId: null, groupName: 'Unassigned' }
		]);
	});

	it('should handle empty friendIds array', () => {
		const groups: Group[] = [
			{
				id: 'g1',
				name: 'Group 1',
				capacity: 5,
				memberIds: ['s1']
			}
		];

		const friendIds: string[] = [];
		const result = getFriendLocations(friendIds, groups);

		expect(result).toEqual([]);
	});

	it('should handle empty groups array', () => {
		const groups: Group[] = [];
		const friendIds = ['s1', 's2', 's3'];
		const result = getFriendLocations(friendIds, groups);

		expect(result).toEqual([
			{ friendId: 's1', groupId: null, groupName: 'Unassigned' },
			{ friendId: 's2', groupId: null, groupName: 'Unassigned' },
			{ friendId: 's3', groupId: null, groupName: 'Unassigned' }
		]);
	});

	it('should find friend in first matching group only', () => {
		// Edge case: student appears in multiple groups (data integrity issue)
		const groups: Group[] = [
			{
				id: 'g1',
				name: 'Group 1',
				capacity: 5,
				memberIds: ['s1', 's2']
			},
			{
				id: 'g2',
				name: 'Group 2',
				capacity: 5,
				memberIds: ['s1', 's3'] // s1 appears here too
			}
		];

		const friendIds = ['s1'];
		const result = getFriendLocations(friendIds, groups);

		// Should return first match
		expect(result).toEqual([{ friendId: 's1', groupId: 'g1', groupName: 'Group 1' }]);
	});

	it('should handle large number of friends and groups', () => {
		const groups: Group[] = Array.from({ length: 10 }, (_, i) => ({
			id: `g${i}`,
			name: `Group ${i}`,
			capacity: 10,
			memberIds: Array.from({ length: 10 }, (_, j) => `s${i * 10 + j}`)
		}));

		const friendIds = ['s0', 's15', 's99'];
		const result = getFriendLocations(friendIds, groups);

		expect(result).toEqual([
			{ friendId: 's0', groupId: 'g0', groupName: 'Group 0' },
			{ friendId: 's15', groupId: 'g1', groupName: 'Group 1' },
			{ friendId: 's99', groupId: 'g9', groupName: 'Group 9' }
		]);
	});

	it('should handle groups with null capacity', () => {
		const groups: Group[] = [
			{
				id: 'g1',
				name: 'Unlimited Group',
				capacity: null,
				memberIds: ['s1', 's2', 's3']
			}
		];

		const friendIds = ['s2'];
		const result = getFriendLocations(friendIds, groups);

		expect(result).toEqual([{ friendId: 's2', groupId: 'g1', groupName: 'Unlimited Group' }]);
	});

	it('should handle special characters in group names', () => {
		const groups: Group[] = [
			{
				id: 'g1',
				name: "Mr. O'Brien's Group (2024)",
				capacity: 5,
				memberIds: ['s1']
			}
		];

		const friendIds = ['s1'];
		const result = getFriendLocations(friendIds, groups);

		expect(result).toEqual([
			{ friendId: 's1', groupId: 'g1', groupName: "Mr. O'Brien's Group (2024)" }
		]);
	});
});
