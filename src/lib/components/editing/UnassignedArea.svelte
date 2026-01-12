<script lang="ts">
	import type { Student } from '$lib/domain';
	import DraggableStudentCard from './DraggableStudentCard.svelte';
	import { droppable } from '$lib/utils/pragmatic-dnd';

	const {
		studentsById,
		unassignedIds = [],
		selectedStudentId = null,
		draggingId = null,
		onDrop,
		onSelect,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>()
	} = $props<{
		studentsById: Record<string, Student>;
		unassignedIds?: string[];
		selectedStudentId?: string | null;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string }) => void;
		onSelect?: (id: string) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
	}>();

	function handleDrop(event: {
		draggedItem: { id: string };
		sourceContainer: string | null;
		targetContainer: string | null;
	}) {
		onDrop?.({
			studentId: event.draggedItem.id,
			source: event.sourceContainer ?? 'unassigned',
			target: 'unassigned'
		});
	}
</script>

<div class="rounded-xl bg-gray-50 p-3">
	<div class="mb-1 flex items-center justify-between">
		<p class="text-sm font-semibold text-gray-900">Not in groups ({unassignedIds.length})</p>
	</div>
	<div
		use:droppable={{ container: 'unassigned', callbacks: { onDrop: handleDrop } }}
		class={`grid content-start justify-items-center gap-2 rounded-lg border border-dashed p-2 ${
			draggingId ? 'border-blue-200 bg-white' : 'border-gray-200'
		}`}
		style="grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));"
	>
		{#if unassignedIds.length === 0}
			<p class="col-span-full py-4 text-center text-xs text-gray-500">All students are assigned</p>
		{:else}
			{#each unassignedIds as studentId (studentId)}
				{#if studentsById[studentId]}
					<DraggableStudentCard
						student={studentsById[studentId]}
						container="unassigned"
						selected={selectedStudentId === studentId}
						isDragging={draggingId === studentId}
						textTone="text-gray-500"
						{onSelect}
						onDragStart={() => onDragStart?.(studentId)}
						{onDragEnd}
						flash={flashingIds.has(studentId)}
					/>
				{/if}
			{/each}
		{/if}
	</div>
</div>
