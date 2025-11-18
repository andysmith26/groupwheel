import type { Student } from '$lib/types';
import type { StudentPreference } from '$lib/types/preferences';

export interface ParsedSheetData {
	students: Student[];
	connections: Record<string, string[]>;
}

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
			students.push({
				id,
				firstName: (row[1] ?? '').trim(),
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

export function createEmptyPreference(studentId: string): StudentPreference {
	return {
		studentId,
		likeStudentIds: [],
		avoidStudentIds: [],
		likeGroupIds: [],
		avoidGroupIds: [],
		meta: {}
	};
}

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
			...(pref.meta ? { meta: { ...pref.meta } } : {})
		};
	}

	for (const student of students) {
		const id = student.id?.trim();
		if (!id) continue;
		if (!result[id]) {
			result[id] = createEmptyPreference(id);
		}
	}

	return result;
}
