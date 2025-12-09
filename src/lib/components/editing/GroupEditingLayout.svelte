<script lang="ts">
	import type { Group, Student } from '$lib/domain';
	import EditableGroupColumn from './EditableGroupColumn.svelte';

	const {
		groups = [],
		studentsById = {},
		selectedStudentId = null,
		draggingId = null,
		onDrop,
		friendIds = new Set(),
		onSelect,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>()
	} = $props<{
		groups?: Group[];
		studentsById?: Record<string, Student>;
		selectedStudentId?: string | null;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string }) => void;
		friendIds?: Set<string>;
		onSelect?: (id: string) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
	}>();
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
	{#each groups as group}
		<EditableGroupColumn
			{group}
			{studentsById}
			{selectedStudentId}
			{draggingId}
			{friendIds}
			onDrop={onDrop}
			onSelect={onSelect}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			flashingIds={flashingIds}
		/>
	{/each}
</div>
