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
 */
export function buildAssignmentList(
	groups: Group[],
	studentsById: Map<string, Student>
): ExportableAssignment[] {
	const assignments: ExportableAssignment[] = [];

	for (const group of groups) {
		for (const studentId of group.memberIds) {
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

	// Sort by group name, then by student name
	assignments.sort((a, b) => {
		const groupCompare = a.groupName.localeCompare(b.groupName);
		if (groupCompare !== 0) return groupCompare;
		return a.studentName.localeCompare(b.studentName);
	});

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
 */
export function exportGroupsToCSV(groups: Group[], studentsById: Map<string, Student>): string {
	const rows: string[] = [];

	// Header
	rows.push('Group,Member Count,Students');

	// Sort groups by name
	const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

	for (const group of sortedGroups) {
		const memberNames = group.memberIds
			.map((id) => {
				const student = studentsById.get(id);
				return student ? getStudentDisplayName(student) : id;
			})
			.sort()
			.join('; ');

		rows.push(
			[escapeCSV(group.name), group.memberIds.length.toString(), escapeCSV(memberNames)].join(',')
		);
	}

	return rows.join('\n');
}

/**
 * Copy text to clipboard.
 * Returns true if successful.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Fallback for older browsers
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand('copy');
			return true;
		} catch {
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	}
}
