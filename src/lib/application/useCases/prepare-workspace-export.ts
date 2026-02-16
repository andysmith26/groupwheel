import type { Group, Preference, Program, Student } from '$lib/domain';
import { extractStudentPreference } from '$lib/domain/preference';
import { err, ok, type Result } from '$lib/types/result';
import {
	ACTIVITY_FILE_VERSION,
	type ActivityExportData
} from '$lib/utils/activityFile';
import { exportGroupsToColumnsTSV } from '$lib/utils/csvExport';
import {
	getWorkspaceGroupsDisplayOrder,
	type GetWorkspaceGroupsDisplayOrderInput
} from './get-workspace-groups-display-order';

export type PrepareWorkspaceExportInput = {
	program: Program | null;
	students: Student[];
	preferences: Preference[];
	groups: Group[];
	algorithmConfig?: unknown;
	rowLayout: GetWorkspaceGroupsDisplayOrderInput['rowLayout'];
	exportedAtIso?: string;
};

export type PrepareWorkspaceExportSuccess = {
	columnsTsv: string;
	activityExportData: ActivityExportData;
};

export type PrepareWorkspaceExportError =
	| { type: 'invalid_input'; message: string }
	| { type: 'missing_entities'; message: string };

function cloneGroup(group: Group): Group {
	return {
		id: group.id,
		name: group.name,
		capacity: group.capacity,
		memberIds: [...group.memberIds]
	};
}

export function prepareWorkspaceExport(
	input: PrepareWorkspaceExportInput
): Result<PrepareWorkspaceExportSuccess, PrepareWorkspaceExportError> {
	if (!input.program) {
		return err({
			type: 'invalid_input',
			message: 'Program is required to prepare export data.'
		});
	}

	if (!Array.isArray(input.students) || !Array.isArray(input.preferences) || !Array.isArray(input.groups)) {
		return err({
			type: 'invalid_input',
			message: 'Students, preferences, and groups are required.'
		});
	}

	const studentsById = new Map(input.students.map((student) => [student.id, student]));
	const missingStudentIds = new Set<string>();

	for (const group of input.groups) {
		for (const studentId of group.memberIds) {
			if (!studentsById.has(studentId)) {
				missingStudentIds.add(studentId);
			}
		}
	}

	if (missingStudentIds.size > 0) {
		return err({
			type: 'missing_entities',
			message: `Groups reference students not found in roster: ${Array.from(missingStudentIds).join(', ')}`
		});
	}

	const orderedGroupsResult = getWorkspaceGroupsDisplayOrder({
		groups: input.groups,
		rowLayout: input.rowLayout ?? null
	});

	if (orderedGroupsResult.status !== 'ok') {
		return err({
			type: 'invalid_input',
			message: 'Unable to resolve workspace group display order.'
		});
	}

	const orderedGroups = orderedGroupsResult.value.groups;
	const columnsTsv = exportGroupsToColumnsTSV(orderedGroups, studentsById);

	const activityExportData: ActivityExportData = {
		version: ACTIVITY_FILE_VERSION,
		exportedAt: input.exportedAtIso ?? new Date().toISOString(),
		activity: {
			name: input.program.name,
			type: input.program.type
		},
		roster: {
			students: input.students.map((student) => ({
				id: student.id,
				firstName: student.firstName,
				lastName: student.lastName,
				gradeLevel: student.gradeLevel,
				gender: student.gender,
				meta: student.meta
			}))
		},
		preferences: input.preferences.map((preference) => {
			const payload = extractStudentPreference(preference);
			return {
				studentId: preference.studentId,
				likeGroupIds: [...payload.likeGroupIds],
				avoidStudentIds: [...payload.avoidStudentIds],
				avoidGroupIds: [...payload.avoidGroupIds]
			};
		}),
		scenario: {
			groups: orderedGroups.map(cloneGroup),
			algorithmConfig: input.algorithmConfig
		}
	};

	return ok({
		columnsTsv,
		activityExportData
	});
}
