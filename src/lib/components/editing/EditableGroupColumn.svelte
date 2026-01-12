<script lang="ts">
	import type { Group, Student } from '$lib/domain';
	import { droppable } from '$lib/utils/pragmatic-dnd';
	import DraggableStudentCard from './DraggableStudentCard.svelte';
	import { getCapacityStatus } from '$lib/utils/groups';

	const {
		group,
		studentsById,
		draggingId = null,
		onDrop,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>(),
		onUpdateGroup,
		onDeleteGroup,
		focusNameOnMount = false,
		rowSpan = 1,
		preferenceRank = null,
		studentPreferenceRanks = new Map<string, number | null>(),
		studentHasPreferences = new Map<string, boolean>(),
		onStudentHoverStart,
		onStudentHoverEnd
	} = $props<{
		group: Group;
		studentsById: Record<string, Student>;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string }) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
		onUpdateGroup?: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
		onDeleteGroup?: (groupId: string) => void;
		focusNameOnMount?: boolean;
		rowSpan?: number;
		preferenceRank?: number | null;
		studentPreferenceRanks?: Map<string, number | null>;
		studentHasPreferences?: Map<string, boolean>;
		onStudentHoverStart?: (studentId: string, x: number, y: number) => void;
		onStudentHoverEnd?: () => void;
	}>();


	const capacityStatus = $derived(getCapacityStatus(group));

	// Configuration: only highlight top N choices with border/background (future: make this user-configurable)
	const MAX_HIGHLIGHTED_RANK = 1;

	// Preference rank styling
	const preferenceStyles = $derived(() => {
		if (preferenceRank === null) return null;

		// Determine label
		const label =
			preferenceRank === 1
				? '1st Choice'
				: preferenceRank === 2
					? '2nd Choice'
					: preferenceRank === 3
						? '3rd Choice'
						: `Choice ${preferenceRank}`;

		// Highlight top choice with border and background
		if (preferenceRank <= MAX_HIGHLIGHTED_RANK) {
			return {
				borderColor: 'border-green-500',
				bgColor: 'bg-green-50',
				textColor: 'text-green-700',
				badgeBg: 'bg-green-100',
				label
			};
		}

		if (preferenceRank === 2) {
			return {
				borderColor: 'border-yellow-400',
				bgColor: 'bg-yellow-50',
				textColor: 'text-yellow-700',
				badgeBg: 'bg-yellow-100',
				label
			};
		}

		// Other choices: default styling, no highlight
		return {
			borderColor: 'border-gray-200',
			bgColor: 'bg-gray-50',
			textColor: 'text-gray-700',
			badgeBg: 'bg-gray-100',
			label
		};
	});

	// Local editing state to handle validation
	let editingName = $state(group.name);

	const capacityLabel = $derived(() => {
		if (group.capacity === null) return `${group.memberIds.length}`;
		return `${group.memberIds.length}/${group.capacity}`;
	});

	const sortedMemberIds = $derived(() => {
		const ids = [...group.memberIds];
		return ids.sort((leftId, rightId) => {
			const left = studentsById[leftId];
			const right = studentsById[rightId];
			if (!left && !right) return leftId.localeCompare(rightId);
			if (!left) return 1;
			if (!right) return -1;

			const leftLast = (left.lastName ?? '').trim();
			const rightLast = (right.lastName ?? '').trim();
			const lastCompare = leftLast.localeCompare(rightLast, undefined, { sensitivity: 'base' });
			if (lastCompare !== 0) return lastCompare;

			const leftFirst = (left.firstName ?? '').trim();
			const rightFirst = (right.firstName ?? '').trim();
			const firstCompare = leftFirst.localeCompare(rightFirst, undefined, { sensitivity: 'base' });
			if (firstCompare !== 0) return firstCompare;

			return left.id.localeCompare(right.id);
		});
	});

	// Sync local state when group changes externally
	$effect(() => {
		editingName = group.name;
	});

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

<div
	class={`relative flex flex-col gap-2 rounded-xl border-2 p-1.5 shadow-sm ${
		preferenceStyles()
			? `${preferenceStyles()!.borderColor} ${preferenceStyles()!.bgColor}`
			: 'border-gray-200 bg-gray-50'
	}`}
	style={`grid-row: span ${rowSpan}; height: 100%;`}
>
	<div class="flex items-center justify-between gap-2">
		<span
			class="min-w-0 flex-1 truncate px-1 py-0.5 text-xs font-semibold text-gray-900"
			title={editingName}
		>
			{editingName}
		</span>
		<span
			class={`text-xs font-medium ${
				capacityStatus.isOverEnrolled ? 'text-violet-600' : 'text-gray-600'
			}`}
		>
			{capacityLabel()}
		</span>
	</div>

	<div
		use:droppable={{ container: group.id, callbacks: { onDrop: handleDrop } }}
		class={`grid flex-1 content-start place-items-center gap-1 px-1 py-1 ${
			draggingId ? 'bg-white' : ''
		}`}
		style="grid-template-columns: 1fr;"
	>
		{#if group.memberIds.length === 0}
			<p class="col-span-full py-6 text-center text-xs text-gray-500">Drop students here</p>
		{:else}
			{#each sortedMemberIds() as memberId (memberId)}
				{#if studentsById[memberId]}
					<DraggableStudentCard
						student={studentsById[memberId]}
						container={group.id}
						isDragging={draggingId === memberId}
						onDragStart={() => onDragStart?.(memberId)}
						{onDragEnd}
						flash={flashingIds.has(memberId)}
						preferenceRank={studentPreferenceRanks.get(memberId) ?? null}
						hasPreferences={studentHasPreferences.get(memberId) ?? false}
						onHoverStart={onStudentHoverStart}
						onHoverEnd={onStudentHoverEnd}
					/>
				{/if}
			{/each}
		{/if}
		<div
			class="mx-auto w-[92px] p-0.5 opacity-0 pointer-events-none select-none"
			aria-hidden="true"
		>
			<div class="px-1.5 py-0.5 text-[15px] font-semibold">&nbsp;</div>
		</div>
	</div>
</div>
