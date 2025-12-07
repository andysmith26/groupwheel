import type { Group } from '$lib/domain';
import type { HappinessContext } from './types';

export function studentHappinessInGroups(
	studentId: string,
	groups: Group[],
	context: HappinessContext
): number {
	const group = groups.find((g) => g.memberIds.includes(studentId));
	if (!group) return 0;
	return studentHappinessForMembers(studentId, group.memberIds, context);
}

export function studentHappinessForMembers(
	studentId: string,
	memberIds: readonly string[],
	context: HappinessContext
): number {
	const pref = context.preferencesById[studentId];
	if (!pref?.likeStudentIds?.length) return 0;

	const memberSet = new Set(memberIds);
	let count = 0;
	for (const friendId of pref.likeStudentIds) {
		if (!context.studentsById[friendId]) continue;
		if (memberSet.has(friendId)) count++;
	}
	return count;
}

export function neighborsHappinessImpact(
	memberIds: readonly string[],
	movedStudentId: string,
	context: HappinessContext
): number {
	let sum = 0;
	for (const otherId of memberIds) {
		if (otherId === movedStudentId) continue;
		const pref = context.preferencesById[otherId];
		if (!pref?.likeStudentIds?.includes(movedStudentId)) continue;
		sum += studentHappinessForMembers(otherId, memberIds, context);
	}
	return sum;
}
