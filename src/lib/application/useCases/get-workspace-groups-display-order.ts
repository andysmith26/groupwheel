import type { Group } from '$lib/domain';
import { ok, type Result } from '$lib/types/result';
import type { WorkspaceRowLayout } from './normalize-workspace-row-layout';

export interface GetWorkspaceGroupsDisplayOrderInput {
	groups: Group[];
	rowLayout: WorkspaceRowLayout | null;
}

export interface GetWorkspaceGroupsDisplayOrderOutput {
	groups: Group[];
}

function cloneGroup(group: Group): Group {
	return {
		...group,
		memberIds: [...group.memberIds]
	};
}

export function getWorkspaceGroupsDisplayOrder(
	input: GetWorkspaceGroupsDisplayOrderInput
): Result<GetWorkspaceGroupsDisplayOrderOutput, never> {
	if (!input.rowLayout) {
		return ok({
			groups: input.groups.map(cloneGroup)
		});
	}

	const groupsById = new Map(input.groups.map((group) => [group.id, group]));
	const orderedGroups: Group[] = [];

	for (const id of input.rowLayout.top) {
		const group = groupsById.get(id);
		if (group) orderedGroups.push(cloneGroup(group));
	}

	for (const id of input.rowLayout.bottom) {
		const group = groupsById.get(id);
		if (group) orderedGroups.push(cloneGroup(group));
	}

	for (const group of input.groups) {
		if (!orderedGroups.some((ordered) => ordered.id === group.id)) {
			orderedGroups.push(cloneGroup(group));
		}
	}

	return ok({ groups: orderedGroups });
}
