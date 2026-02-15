import { describe, it, expect } from 'vitest';
import {
	buildAssignmentList,
	exportToCSV,
	exportToTSV,
	exportGroupsToCSV,
	exportGroupsToColumnsTSV
} from './csvExport';
import type { ExportableAssignment } from './csvExport';
import type { Group } from '$lib/domain/group';
import type { Student } from '$lib/domain/student';

function makeStudent(id: string, firstName: string, lastName: string, grade?: string): Student {
	return { id, firstName, lastName, gradeLevel: grade };
}

function makeGroup(id: string, name: string, memberIds: string[]): Group {
	return { id, name, capacity: null, memberIds };
}

function makeStudentsMap(...students: Student[]): Map<string, Student> {
	return new Map(students.map((s) => [s.id, s]));
}

describe('buildAssignmentList', () => {
	it('should build assignment list from groups and students', () => {
		const alice = makeStudent('alice', 'Alice', 'Smith', '5');
		const bob = makeStudent('bob', 'Bob', 'Jones', '5');
		const groups = [makeGroup('g1', 'Art Club', ['alice', 'bob'])];
		const studentsById = makeStudentsMap(alice, bob);

		const result = buildAssignmentList(groups, studentsById);

		expect(result).toHaveLength(2);
		expect(result[0].groupName).toBe('Art Club');
		expect(result[0].firstName).toBe('Bob'); // Jones sorts before Smith
		expect(result[1].firstName).toBe('Alice');
	});

	it('should handle missing students with fallback', () => {
		const groups = [makeGroup('g1', 'Art Club', ['unknown-id'])];
		const studentsById = new Map<string, Student>();

		const result = buildAssignmentList(groups, studentsById);

		expect(result).toHaveLength(1);
		expect(result[0].studentId).toBe('unknown-id');
		expect(result[0].studentName).toBe('unknown-id');
	});

	it('should handle empty groups', () => {
		const groups = [makeGroup('g1', 'Art Club', [])];
		const studentsById = new Map<string, Student>();

		expect(buildAssignmentList(groups, studentsById)).toEqual([]);
	});

	it('should preserve group order', () => {
		const alice = makeStudent('alice', 'Alice', 'Smith');
		const bob = makeStudent('bob', 'Bob', 'Jones');
		const groups = [
			makeGroup('g2', 'Music', ['bob']),
			makeGroup('g1', 'Art', ['alice'])
		];
		const studentsById = makeStudentsMap(alice, bob);

		const result = buildAssignmentList(groups, studentsById);
		expect(result[0].groupName).toBe('Music');
		expect(result[1].groupName).toBe('Art');
	});
});

describe('exportToCSV', () => {
	const assignments: ExportableAssignment[] = [
		{
			studentId: 'alice',
			studentName: 'Alice Smith',
			firstName: 'Alice',
			lastName: 'Smith',
			grade: '5',
			groupName: 'Art Club',
			groupId: 'g1'
		}
	];

	it('should include header row by default', () => {
		const csv = exportToCSV(assignments);
		expect(csv.split('\n')[0]).toContain('Student ID');
		expect(csv.split('\n')[0]).toContain('First Name');
		expect(csv.split('\n')[0]).toContain('Group');
	});

	it('should exclude header when includeHeader is false', () => {
		const csv = exportToCSV(assignments, { includeHeader: false });
		expect(csv.split('\n')).toHaveLength(1);
		expect(csv).not.toContain('Student ID');
	});

	it('should exclude student ID column when includeStudentId is false', () => {
		const csv = exportToCSV(assignments, { includeStudentId: false });
		expect(csv.split('\n')[0]).not.toContain('Student ID');
	});

	it('should exclude grade column when includeGrade is false', () => {
		const csv = exportToCSV(assignments, { includeGrade: false });
		expect(csv.split('\n')[0]).not.toContain('Grade');
	});

	it('should escape values with commas', () => {
		const withComma: ExportableAssignment[] = [
			{
				studentId: 'alice',
				studentName: 'Smith, Alice',
				firstName: 'Alice',
				lastName: 'Smith, Jr.',
				grade: '5',
				groupName: 'Art Club',
				groupId: 'g1'
			}
		];
		const csv = exportToCSV(withComma);
		expect(csv).toContain('"Smith, Jr."');
	});

	it('should escape values with quotes', () => {
		const withQuote: ExportableAssignment[] = [
			{
				studentId: 'alice',
				studentName: 'Alice "Ace" Smith',
				firstName: 'Alice "Ace"',
				lastName: 'Smith',
				grade: '5',
				groupName: 'Art Club',
				groupId: 'g1'
			}
		];
		const csv = exportToCSV(withQuote);
		expect(csv).toContain('"Alice ""Ace"""');
	});
});

describe('exportToTSV', () => {
	const assignments: ExportableAssignment[] = [
		{
			studentId: 'alice',
			studentName: 'Alice Smith',
			firstName: 'Alice',
			lastName: 'Smith',
			grade: '5',
			groupName: 'Art Club',
			groupId: 'g1'
		}
	];

	it('should use tab separators', () => {
		const tsv = exportToTSV(assignments);
		expect(tsv.split('\n')[0]).toContain('\t');
	});

	it('should include header by default', () => {
		const tsv = exportToTSV(assignments);
		expect(tsv.split('\n')[0]).toContain('Student ID');
	});
});

describe('exportGroupsToCSV', () => {
	it('should export groups with member names', () => {
		const alice = makeStudent('alice', 'Alice', 'Smith');
		const bob = makeStudent('bob', 'Bob', 'Jones');
		const groups = [makeGroup('g1', 'Art Club', ['alice', 'bob'])];
		const studentsById = makeStudentsMap(alice, bob);

		const csv = exportGroupsToCSV(groups, studentsById);
		const lines = csv.split('\n');

		expect(lines[0]).toBe('Group,Member Count,Students');
		expect(lines[1]).toContain('Art Club');
		expect(lines[1]).toContain('2');
	});
});

describe('exportGroupsToColumnsTSV', () => {
	it('should export groups as columns', () => {
		const alice = makeStudent('alice', 'Alice', 'Smith');
		const bob = makeStudent('bob', 'Bob', 'Jones');
		const groups = [
			makeGroup('g1', 'Art', ['alice']),
			makeGroup('g2', 'Music', ['bob'])
		];
		const studentsById = makeStudentsMap(alice, bob);

		const tsv = exportGroupsToColumnsTSV(groups, studentsById);
		const lines = tsv.split('\n');

		expect(lines[0]).toBe('Art\tMusic');
		expect(lines).toHaveLength(2); // header + 1 row (max 1 member per group)
	});

	it('should pad shorter groups with empty cells', () => {
		const alice = makeStudent('alice', 'Alice', 'Smith');
		const bob = makeStudent('bob', 'Bob', 'Jones');
		const carol = makeStudent('carol', 'Carol', 'White');
		const groups = [
			makeGroup('g1', 'Art', ['alice', 'bob']),
			makeGroup('g2', 'Music', ['carol'])
		];
		const studentsById = makeStudentsMap(alice, bob, carol);

		const tsv = exportGroupsToColumnsTSV(groups, studentsById);
		const lines = tsv.split('\n');

		expect(lines).toHaveLength(3); // header + 2 rows (max 2 members)
		// Last row should have empty cell for Music column
		expect(lines[2].split('\t')[1]).toBe('');
	});
});
