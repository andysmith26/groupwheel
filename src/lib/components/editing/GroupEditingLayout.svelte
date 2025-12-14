<script lang="ts">
	import type { Group, Student } from '$lib/domain';
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
		newGroupId = null
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
	}>();
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
	{#each groups as group (group.id)}
		<EditableGroupColumn
			{group}
			{studentsById}
			{selectedStudentId}
			{draggingId}
			onDrop={onDrop}
			onSelect={onSelect}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			flashingIds={flashingIds}
			onUpdateGroup={onUpdateGroup}
			onDeleteGroup={onDeleteGroup}
			focusNameOnMount={group.id === newGroupId}
		/>
	{/each}

	{#if onAddGroup}
		<AddGroupCard {onAddGroup} />
	{/if}
</div>
