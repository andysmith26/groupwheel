<script lang="ts">
	import type { Group, Student } from '$lib/domain';
	import { calculateRowSpan } from '$lib/utils/groups';
	import EditableGroupColumn from './EditableGroupColumn.svelte';
	import AddGroupCard from './AddGroupCard.svelte';

	const {
		groups = [],
		studentsById = {},
		selectedStudentId = null,
		draggingId = null,
		onDrop,
		onSelect,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>(),
		onUpdateGroup,
		onDeleteGroup,
		onAddGroup,
		newGroupId = null,
		selectedStudentPreferences = null
	} = $props<{
		groups?: Group[];
		studentsById?: Record<string, Student>;
		selectedStudentId?: string | null;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string }) => void;
		onSelect?: (id: string) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
		onUpdateGroup?: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
		onDeleteGroup?: (groupId: string) => void;
		onAddGroup?: () => void;
		newGroupId?: string | null;
		selectedStudentPreferences?: string[] | null;
	}>();

	// Helper to get preference rank for a group
	function getPreferenceRank(groupId: string): number | null {
		if (!selectedStudentPreferences || selectedStudentPreferences.length === 0) {
			return null;
		}
		const index = selectedStudentPreferences.indexOf(groupId);
		const rank = index >= 0 ? index + 1 : null;
		return rank;
	}
</script>

<div class="group-grid">
	{#each groups as group (group.id)}
		<EditableGroupColumn
			{group}
			{studentsById}
			{selectedStudentId}
			{draggingId}
			rowSpan={calculateRowSpan(group)}
			onDrop={onDrop}
			onSelect={onSelect}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			flashingIds={flashingIds}
			onUpdateGroup={onUpdateGroup}
			onDeleteGroup={onDeleteGroup}
			focusNameOnMount={group.id === newGroupId}
			preferenceRank={getPreferenceRank(group.id)}
		/>
	{/each}

	{#if onAddGroup}
		<AddGroupCard rowSpan={4} {onAddGroup} />
	{/if}
</div>

<style>
	.group-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		grid-auto-rows: 40px;
		grid-auto-flow: dense;
		gap: 16px;
	}

	@media (min-width: 768px) {
		.group-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.group-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
