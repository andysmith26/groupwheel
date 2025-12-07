import type { Student, StudentPreference } from '$lib/domain';

export const SHEET_DATA_GUIDANCE = [
	'"Students" tab: columns A–D should be ID, First Name, Last Name, Gender (with a header row).',
	'"Connections" tab: each row must start with the same student ID/email used on the Students tab followed by friend IDs in additional columns.',
	'Friend IDs have to match the IDs from the Students tab exactly (case-insensitive).'
];

export class SheetDataError extends Error {
	guidance: string[];
	constructor(message: string, guidance: string[] = SHEET_DATA_GUIDANCE) {
		super(message);
		this.name = 'SheetDataError';
		this.guidance = guidance;
	}
}

export interface RosterData {
	studentsById: Record<string, Student>;
	preferencesById: Record<string, StudentPreference>;
	studentOrder: string[];
	unknownFriendIds: Set<string>;
}

export interface SheetStudentPayload {
	id?: string;
	firstName?: string;
	lastName?: string;
	gender?: string;
}

export interface SheetApiPayload {
	success?: boolean;
	students?: SheetStudentPayload[];
	connections?: Record<string, unknown>;
	studentCount?: number;
}

export function parseRosterFromPaste(text: string): RosterData {
	const lines = text
		.trim()
		.split(/\r?\n/)
		.filter((l) => l.trim().length > 0);
	if (lines.length < 2) {
		throw new Error('Please paste at least a header row and one data row.');
	}

	const delimiter = lines[0].includes('\t') ? '\t' : ',';
	const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
	const colName = (wanted: string) => header.findIndex((h) => h === wanted);

	const nameIdx = header.findIndex((h) => h === 'display name' || h === 'name');
	const idIdx = colName('id');
	if (nameIdx === -1 || idIdx === -1) {
		throw new Error('Headers must include "display name" (or "name") and "id".');
	}

	const friendIdxs = header
		.map((h, i) => ({ h, i }))
		.filter(({ h }) => /^friend\s*\d+\s*id$/i.test(h))
		.map(({ i }) => i)
		.sort((a, b) => a - b);

	const map: Record<string, Student> = {};
	const order: string[] = [];
	const prefMap: Record<string, StudentPreference> = {};
	const unknownSet = new Set<string>();

	for (let r = 1; r < lines.length; r++) {
		const raw = lines[r];
		const cells = splitCsvTsvRow(raw, delimiter, header.length);
		if (!cells) continue;

		const name = (cells[nameIdx] ?? '').trim();
		const id = (cells[idIdx] ?? '').trim().toLowerCase();

		if (!id) {
			continue;
		}
		if (map[id]) {
			throw new Error(`Duplicate id found on row ${r + 1}: ${id}`);
		}

		const friendIds = friendIdxs
			.map((idx) => (cells[idx] ?? '').trim().toLowerCase())
			.filter((fid) => fid.length > 0);

		const nameParts = name.trim().split(' ');
		const firstName = nameParts[0] || '';
		const lastName = nameParts.slice(1).join(' ') || '';

		map[id] = {
			id,
			firstName,
			lastName,
			gender: ''
		};
		order.push(id);

		prefMap[id] = {
			studentId: id,
			likeStudentIds: friendIds,
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: [],
			meta: {}
		};
	}

	for (const id of Object.keys(prefMap)) {
		const pref = prefMap[id];
		const validFriends: string[] = [];
		for (const fid of pref.likeStudentIds) {
			if (map[fid]) {
				validFriends.push(fid);
			} else {
				unknownSet.add(fid);
			}
		}
		pref.likeStudentIds = validFriends;
	}

	return {
		studentsById: map,
		preferencesById: prefMap,
		studentOrder: order,
		unknownFriendIds: unknownSet
	};
}

export function parseRosterFromSheets(
	students: Array<{ id: string; firstName: string; lastName: string; gender: string }>,
	connections: Record<string, string[]>
): RosterData {
	const map: Record<string, Student> = {};
	const prefMap: Record<string, StudentPreference> = {};
	const order: string[] = [];
	const unknownSet = new Set<string>();

	for (const student of students) {
		if (!student.id) continue;

		const id = student.id.toLowerCase();

		if (map[id]) {
			throw new Error(`Duplicate student ID: ${student.id}`);
		}

		const friendList =
			connections[student.id] || connections[id] || connections[student.id.toUpperCase()] || [];
		const friendIds = friendList.map((fid) => fid.toLowerCase());

		map[id] = {
			id,
			firstName: student.firstName,
			lastName: student.lastName,
			gender: student.gender
		};

		prefMap[id] = {
			studentId: id,
			likeStudentIds: friendIds,
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: [],
			meta: {}
		};

		order.push(id);
	}

	for (const id of Object.keys(prefMap)) {
		const pref = prefMap[id];
		const validFriends: string[] = [];
		for (const fid of pref.likeStudentIds) {
			if (map[fid]) {
				validFriends.push(fid);
			} else {
				unknownSet.add(fid);
			}
		}
		pref.likeStudentIds = validFriends;
	}

	return {
		studentsById: map,
		preferencesById: prefMap,
		studentOrder: order,
		unknownFriendIds: unknownSet
	};
}

export function splitCsvTsvRow(row: string, delim: string, minCols: number) {
	const parts = row.split(delim);
	if (parts.length < minCols) {
		while (parts.length < minCols) parts.push('');
	}
	return parts;
}

export function normalizeSheetResponse(payload: unknown) {
	const data = (payload ?? {}) as SheetApiPayload;
	const students = Array.isArray(data.students) ? data.students : [];

	if (students.length === 0) {
		throw new SheetDataError(
			'No student rows were returned from Google Sheets.',
			SHEET_DATA_GUIDANCE
		);
	}

	const validStudents: Array<{ id: string; firstName: string; lastName: string; gender: string }> =
		[];
	for (const student of students) {
		if (!student || typeof student !== 'object') continue;
		const id = typeof student.id === 'string' ? student.id.trim() : '';
		if (!id) continue;
		validStudents.push({
			id,
			firstName: typeof student.firstName === 'string' ? student.firstName : '',
			lastName: typeof student.lastName === 'string' ? student.lastName : '',
			gender: typeof student.gender === 'string' ? student.gender : ''
		});
	}

	if (validStudents.length === 0) {
		throw new SheetDataError(
			"No IDs were found in the Students tab. Column A must contain each student's email or unique ID.",
			SHEET_DATA_GUIDANCE
		);
	}

	const normalizedConnections: Record<string, string[]> = {};
	const rawConnections =
		data.connections && typeof data.connections === 'object' ? data.connections : {};
	for (const [rawKey, rawValue] of Object.entries(rawConnections)) {
		const key = rawKey.trim().toLowerCase();
		if (!key) continue;
		if (!Array.isArray(rawValue)) continue;
		const cleaned = rawValue
			.map((fid) => (typeof fid === 'string' ? fid.trim().toLowerCase() : ''))
			.filter((fid) => fid.length > 0);
		if (cleaned.length > 0) {
			normalizedConnections[key] = cleaned;
		}
	}

	return { students: validStudents, connections: normalizedConnections };
}

export function getTestRosterDataset() {
	const students = [
		{ id: 'and-al-1', firstName: 'Alice', lastName: 'Anderson', gender: 'F' },
		{ id: 'bro-bo-1', firstName: 'Bob', lastName: 'Brown', gender: 'M' },
		{ id: 'che-ca-1', firstName: 'Carol', lastName: 'Chen', gender: 'F' },
		{ id: 'dav-da-1', firstName: 'David', lastName: 'Davis', gender: 'M' },
		{ id: 'eva-ev-1', firstName: 'Eve', lastName: 'Evans', gender: 'F' },
		{ id: 'fos-fr-1', firstName: 'Frank', lastName: 'Foster', gender: 'M' },
		{ id: 'gar-gr-1', firstName: 'Grace', lastName: 'Garcia', gender: 'F' },
		{ id: 'har-he-1', firstName: 'Henry', lastName: 'Harris', gender: 'M' },
		{ id: 'iva-ir-1', firstName: 'Iris', lastName: 'Ivanov', gender: 'F' },
		{ id: 'jac-ja-1', firstName: 'Jack', lastName: 'Jackson', gender: 'M' },
		{ id: 'kim-ka-1', firstName: 'Kate', lastName: 'Kim', gender: 'F' },
		{ id: 'lop-le-1', firstName: 'Leo', lastName: 'Lopez', gender: 'M' },
		{ id: 'mil-ma-1', firstName: 'Maya', lastName: 'Miller', gender: 'F' },
		{ id: 'ngu-ni-1', firstName: 'Nina', lastName: 'Nguyen', gender: 'F' },
		{ id: 'ort-os-1', firstName: 'Oscar', lastName: 'Ortiz', gender: 'M' },
		{ id: 'par-pa-1', firstName: 'Paul', lastName: 'Park', gender: 'M' },
		{ id: 'qui-qu-1', firstName: 'Quinn', lastName: 'Quinn', gender: 'X' },
		{ id: 'rob-ro-1', firstName: 'Rose', lastName: 'Roberts', gender: 'F' },
		{ id: 'smi-sa-1', firstName: 'Sam', lastName: 'Smith', gender: 'M' },
		{ id: 'tay-ti-1', firstName: 'Tina', lastName: 'Taylor', gender: 'F' }
	];

	const connections: Record<string, string[]> = {
		'and-al-1': ['bro-bo-1', 'che-ca-1', 'iva-ir-1'],
		'bro-bo-1': ['and-al-1', 'mil-ma-1', 'tay-ti-1'],
		'che-ca-1': ['and-al-1', 'eva-ev-1', 'kim-ka-1'],
		'dav-da-1': ['fos-fr-1', 'par-pa-1', 'smi-sa-1'],
		'eva-ev-1': ['che-ca-1', 'kim-ka-1', 'rob-ro-1'],
		'fos-fr-1': ['dav-da-1', 'lop-le-1', 'qui-qu-1'],
		'gar-gr-1': ['ngu-ni-1', 'rob-ro-1'],
		'har-he-1': ['jac-ja-1', 'ort-os-1', 'smi-sa-1'],
		'iva-ir-1': ['and-al-1', 'mil-ma-1'],
		'jac-ja-1': ['har-he-1', 'ort-os-1'],
		'kim-ka-1': ['che-ca-1', 'eva-ev-1', 'par-pa-1'],
		'lop-le-1': ['fos-fr-1', 'qui-qu-1'],
		'mil-ma-1': ['bro-bo-1', 'iva-ir-1', 'tay-ti-1'],
		'ngu-ni-1': ['gar-gr-1', 'rob-ro-1'],
		'ort-os-1': ['har-he-1', 'jac-ja-1'],
		'par-pa-1': ['dav-da-1', 'kim-ka-1'],
		'qui-qu-1': ['fos-fr-1', 'lop-le-1'],
		'rob-ro-1': ['eva-ev-1', 'gar-gr-1', 'ngu-ni-1'],
		'smi-sa-1': ['dav-da-1', 'har-he-1'],
		'tay-ti-1': ['bro-bo-1', 'mil-ma-1']
	};

	return { students, connections };
}
