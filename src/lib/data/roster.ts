/**
 * Roster parsing utilities.
 *
 * Functions for parsing student and connection data from Google Sheets
 * or other tabular sources.
 *
 * @module data/roster
 */

import type { Student } from '$lib/domain';
import type { StudentPreference } from '$lib/domain';
import { createEmptyStudentPreference } from '$lib/domain/preference';

export interface ParsedSheetData {
	students: Student[];
	connections: Record<string, string[]>;
}

/**
 * Parse raw sheet rows into students and connections.
 *
 * Expected format:
 * - studentRows: [headers, ...data] where columns are [id, firstName, lastName, gender]
 * - connectionRows: [headers, ...data] where columns are [studentId, friendId1, friendId2, ...]
 */
export function parseSheetRows(
	studentRows: string[][] | null | undefined,
	connectionRows: string[][] | null | undefined
): ParsedSheetData {
	const students: Student[] = [];
	const connections: Record<string, string[]> = {};

	if (Array.isArray(studentRows) && studentRows.length > 1) {
		for (let i = 1; i < studentRows.length; i++) {
			const row = studentRows[i] ?? [];
			const id = (row[0] ?? '').trim();
			if (!id) continue;
			
			const firstName = (row[1] ?? '').trim();
			if (!firstName) continue; // firstName is required
			
			students.push({
				id,
				firstName,
				lastName: (row[2] ?? '').trim(),
				gender: (row[3] ?? '').trim()
			});
		}
	}

	if (Array.isArray(connectionRows) && connectionRows.length > 1) {
		for (let i = 1; i < connectionRows.length; i++) {
			const row = connectionRows[i] ?? [];
			const studentId = (row[0] ?? '').trim();
			if (!studentId) continue;
			const friendIds: string[] = [];
			for (let j = 1; j < row.length; j++) {
				const friendId = (row[j] ?? '').trim();
				if (friendId) friendIds.push(friendId);
			}
			connections[studentId] = friendIds;
		}
	}

	return { students, connections };
}

/**
 * @deprecated Use createEmptyStudentPreference from '$lib/domain/preference' instead.
 */
export function createEmptyPreference(studentId: string): StudentPreference {
	return createEmptyStudentPreference(studentId);
}

/**
 * Ensure all students have a preference record, creating empty ones if needed.
 * Also normalizes existing preferences.
 */
export function ensurePreferences(
	students: Student[],
	preferences: Iterable<StudentPreference>
): Record<string, StudentPreference> {
	const result: Record<string, StudentPreference> = {};

	for (const pref of preferences) {
		const studentId = pref.studentId?.trim();
		if (!studentId) continue;
		result[studentId] = {
			studentId,
			likeStudentIds: [...(pref.likeStudentIds ?? [])],
			avoidStudentIds: [...(pref.avoidStudentIds ?? [])],
			likeGroupIds: [...(pref.likeGroupIds ?? [])],
			avoidGroupIds: [...(pref.avoidGroupIds ?? [])],
			meta: pref.meta ? { ...pref.meta } : {}
		};
	}

	for (const student of students) {
		const id = student.id?.trim();
		if (!id) continue;
		if (!result[id]) {
			result[id] = { ...createEmptyStudentPreference(id), meta: {} };
		}
	}

	return result;
}
