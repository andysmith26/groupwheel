<script lang="ts">
	import type { Group, Student } from '$lib/domain';
	import { droppable } from '$lib/utils/pragmatic-dnd';
	import DraggableStudentCard from './DraggableStudentCard.svelte';
	import { getCapacityStatus } from '$lib/utils/groups';

	const {
		group,
		studentsById,
		selectedStudentId = null,
		draggingId = null,
		onDrop,
		friendIds = new Set(),
		onSelect,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>()
	} = $props<{
		group: Group;
		studentsById: Record<string, Student>;
		selectedStudentId?: string | null;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string }) => void;
		friendIds?: Set<string>;
		onSelect?: (id: string) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
	}>();

	const capacityStatus = $derived(getCapacityStatus(group));

	function handleDrop(event: {
		draggedItem: { id: string };
		sourceContainer: string | null;
		targetContainer: string | null;
	}) {
		if (!event.targetContainer) return;
		onDrop?.({
			studentId: event.draggedItem.id,
			source: event.sourceContainer ?? 'unassigned',
			target: event.targetContainer
		});
	}
</script>

<div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm font-semibold text-gray-900">{group.name}</p>
			<p class="text-xs text-gray-600">
				{group.memberIds.length}/{group.capacity ?? '∞'} students
			</p>
		</div>
		<div
			class={`rounded-full px-3 py-1 text-xs font-semibold ${
				capacityStatus.isFull
					? 'bg-red-100 text-red-700'
					: capacityStatus.isWarning
						? 'bg-amber-100 text-amber-700'
						: 'bg-gray-200 text-gray-700'
			}`}
		>
			{group.capacity === null ? 'No limit' : `${group.memberIds.length}/${group.capacity}`}
		</div>
	</div>

	<div
		use:droppable={{ container: group.id, callbacks: { onDrop: handleDrop } }}
		class={`flex min-h-[140px] flex-col gap-2 rounded-lg border border-dashed px-2 py-2 ${
			draggingId ? 'border-blue-200 bg-white' : 'border-gray-200'
		}`}
	>
		{#if group.memberIds.length === 0}
			<p class="py-6 text-center text-xs text-gray-500">Drop students here</p>
		{:else}
			{#each group.memberIds as memberId (memberId)}
				{#if studentsById[memberId]}
					<DraggableStudentCard
						student={studentsById[memberId]}
						container={group.id}
						selected={selectedStudentId === memberId}
						isDragging={draggingId === memberId}
						isFriend={friendIds.has(memberId)}
						onSelect={onSelect}
						onDragStart={() => onDragStart?.(memberId)}
						onDragEnd={onDragEnd}
						flash={flashingIds.has(memberId)}
					/>
				{/if}
			{/each}
		{/if}
	</div>
</div>
