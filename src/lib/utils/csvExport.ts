/**
 * CSV Export Utilities
 *
 * Functions for exporting group assignment data to CSV format
 * for easy pasting into spreadsheets.
 *
 * @module utils/csvExport
 */

import type { Group } from '$lib/domain/group';
import type { Student } from '$lib/domain/student';
import { getStudentDisplayName } from '$lib/domain/student';

/**
 * Compare two students for sorting: by last name, then first name, then ID.
 * Matches the sort order used in the UI (EditableGroupColumn).
 */
function compareStudents(a: Student | null, b: Student | null, aId: string, bId: string): number {
	if (!a && !b) return aId.localeCompare(bId);
	if (!a) return 1;
	if (!b) return -1;

	const aLast = (a.lastName ?? '').trim();
	const bLast = (b.lastName ?? '').trim();
	const lastCompare = aLast.localeCompare(bLast, undefined, { sensitivity: 'base' });
	if (lastCompare !== 0) return lastCompare;

	const aFirst = (a.firstName ?? '').trim();
	const bFirst = (b.firstName ?? '').trim();
	const firstCompare = aFirst.localeCompare(bFirst, undefined, { sensitivity: 'base' });
	if (firstCompare !== 0) return firstCompare;

	return a.id.localeCompare(b.id);
}

/**
 * Sort student IDs by last name, then first name (matching UI display order).
 */
function sortStudentIds(memberIds: string[], studentsById: Map<string, Student>): string[] {
	return [...memberIds].sort((aId, bId) => {
		const a = studentsById.get(aId) ?? null;
		const b = studentsById.get(bId) ?? null;
		return compareStudents(a, b, aId, bId);
	});
}

export interface ExportableAssignment {
	studentId: string;
	studentName: string;
	firstName: string;
	lastName: string;
	grade?: string;
	groupName: string;
	groupId: string;
}

/**
 * Build a list of student-to-group assignments from groups and students.
 * Preserves the order of groups as given, with students sorted alphabetically within each group.
 */
export function buildAssignmentList(
	groups: Group[],
	studentsById: Map<string, Student>
): ExportableAssignment[] {
	const assignments: ExportableAssignment[] = [];

	for (const group of groups) {
		// Sort students by last name, then first name (matching UI display order)
		const sortedIds = sortStudentIds(group.memberIds, studentsById);

		for (const studentId of sortedIds) {
			const student = studentsById.get(studentId);
			if (student) {
				assignments.push({
					studentId: student.id,
					studentName: getStudentDisplayName(student),
					firstName: student.firstName,
					lastName: student.lastName ?? '',
					grade: student.gradeLevel,
					groupName: group.name,
					groupId: group.id
				});
			} else {
				// Student not found, use ID as fallback
				assignments.push({
					studentId,
					studentName: studentId,
					firstName: studentId,
					lastName: '',
					grade: undefined,
					groupName: group.name,
					groupId: group.id
				});
			}
		}
	}

	return assignments;
}

/**
 * Escape a value for CSV (handles quotes and commas).
 */
function escapeCSV(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Export assignments to CSV format.
 * Returns a string that can be copied to clipboard or downloaded.
 */
export function exportToCSV(
	assignments: ExportableAssignment[],
	options?: {
		/** Include header row (default: true) */
		includeHeader?: boolean;
		/** Include student ID column (default: true) */
		includeStudentId?: boolean;
		/** Include grade column (default: true) */
		includeGrade?: boolean;
	}
): string {
	const includeHeader = options?.includeHeader ?? true;
	const includeStudentId = options?.includeStudentId ?? true;
	const includeGrade = options?.includeGrade ?? true;

	const rows: string[] = [];

	// Header row
	if (includeHeader) {
		const headerCols: string[] = [];
		if (includeStudentId) headerCols.push('Student ID');
		headerCols.push('First Name', 'Last Name');
		if (includeGrade) headerCols.push('Grade');
		headerCols.push('Group');
		rows.push(headerCols.join(','));
	}

	// Data rows
	for (const assignment of assignments) {
		const cols: string[] = [];
		if (includeStudentId) cols.push(escapeCSV(assignment.studentId));
		cols.push(escapeCSV(assignment.firstName));
		cols.push(escapeCSV(assignment.lastName));
		if (includeGrade) cols.push(escapeCSV(assignment.grade ?? ''));
		cols.push(escapeCSV(assignment.groupName));
		rows.push(cols.join(','));
	}

	return rows.join('\n');
}

/**
 * Export assignments to TSV format (tab-separated, for direct paste into Google Sheets).
 */
export function exportToTSV(
	assignments: ExportableAssignment[],
	options?: {
		includeHeader?: boolean;
		includeStudentId?: boolean;
		includeGrade?: boolean;
	}
): string {
	const includeHeader = options?.includeHeader ?? true;
	const includeStudentId = options?.includeStudentId ?? true;
	const includeGrade = options?.includeGrade ?? true;

	const rows: string[] = [];

	// Header row
	if (includeHeader) {
		const headerCols: string[] = [];
		if (includeStudentId) headerCols.push('Student ID');
		headerCols.push('First Name', 'Last Name');
		if (includeGrade) headerCols.push('Grade');
		headerCols.push('Group');
		rows.push(headerCols.join('\t'));
	}

	// Data rows (TSV doesn't need escaping for simple values)
	for (const assignment of assignments) {
		const cols: string[] = [];
		if (includeStudentId) cols.push(assignment.studentId);
		cols.push(assignment.firstName);
		cols.push(assignment.lastName);
		if (includeGrade) cols.push(assignment.grade ?? '');
		cols.push(assignment.groupName);
		rows.push(cols.join('\t'));
	}

	return rows.join('\n');
}

/**
 * Export a group-centric view (one row per group with student names).
 * Preserves the order of groups as given, with students sorted alphabetically within each group.
 */
export function exportGroupsToCSV(groups: Group[], studentsById: Map<string, Student>): string {
	const rows: string[] = [];

	// Header
	rows.push('Group,Member Count,Students');

	for (const group of groups) {
		// Sort students by last name, then first name (matching UI display order)
		const sortedIds = sortStudentIds(group.memberIds, studentsById);
		const memberNames = sortedIds
			.map((id) => {
				const student = studentsById.get(id);
				return student ? getStudentDisplayName(student) : id;
			})
			.join('; ');

		rows.push(
			[escapeCSV(group.name), group.memberIds.length.toString(), escapeCSV(memberNames)].join(',')
		);
	}

	return rows.join('\n');
}

/**
 * Export groups as columns for Google Sheets (group names as header row).
 * Preserves group order as given, with students sorted by last name then first name within each group.
 */
export function exportGroupsToColumnsTSV(
	groups: Group[],
	studentsById: Map<string, Student>
): string {
	const rows: string[] = [];

	const header = groups.map((group) => group.name);
	rows.push(header.join('\t'));

	// Sort students within each group (matching UI display order)
	const sortedMemberIdsByGroup = groups.map((group) =>
		sortStudentIds(group.memberIds, studentsById)
	);

	const maxMembers = groups.reduce((max, group) => Math.max(max, group.memberIds.length), 0);

	for (let rowIndex = 0; rowIndex < maxMembers; rowIndex += 1) {
		const row = sortedMemberIdsByGroup.map((sortedIds) => {
			const studentId = sortedIds[rowIndex];
			if (!studentId) return '';
			const student = studentsById.get(studentId);
			return student ? getStudentDisplayName(student) : studentId;
		});
		rows.push(row.join('\t'));
	}

	return rows.join('\n');
}
