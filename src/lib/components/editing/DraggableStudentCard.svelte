<script lang="ts">
	import type { Student } from '$lib/domain';
	import { draggable } from '$lib/utils/pragmatic-dnd';

	const {
		student,
		container,
		selected = false,
		isDragging = false,
		onSelect,
		onDragStart,
		onDragEnd,
		flash = false,
		preferenceRank = null,
		onHoverStart,
		onHoverEnd
	} = $props<{
		student: Student;
		container: string;
		selected?: boolean;
		isDragging?: boolean;
		onSelect?: (id: string) => void;
		onDragStart?: () => void;
		onDragEnd?: () => void;
		flash?: boolean;
		preferenceRank?: number | null;
		onHoverStart?: (studentId: string, x: number, y: number) => void;
		onHoverEnd?: () => void;
	}>();

	const name = `${student.firstName} ${student.lastName ?? ''}`.trim() || student.id;
	const gotTopChoice = $derived(preferenceRank === 1);

	// Hover delay handling (300ms)
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

	function handleMouseEnter(event: MouseEvent) {
		if (isDragging) return;

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = rect.right;
		const y = rect.top;

		hoverTimeout = setTimeout(() => {
			onHoverStart?.(student.id, x, y);
		}, 300);
	}

	function handleMouseLeave() {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		onHoverEnd?.();
	}

	function handleDragStartInternal() {
		// Cancel any pending hover when drag starts
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		onHoverEnd?.();
		onDragStart?.();
	}
</script>

<div
	use:draggable={{
		container,
		dragData: { id: student.id },
		callbacks: { onDragStart: handleDragStartInternal, onDragEnd }
	}}
	class={`rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition duration-150 ease-out cursor-grab ${
		selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
	} ${isDragging ? 'opacity-60 cursor-grabbing' : ''} ${flash ? 'flash-move' : ''}`}
	role="button"
	tabindex="0"
	onclick={() => onSelect?.(student.id)}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onSelect?.(student.id);
		}
	}}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<div class="flex items-center justify-between gap-1">
		<span class="font-medium text-gray-900">{name}</span>
		{#if gotTopChoice}
			<span class="text-yellow-500" title="Got 1st choice">★</span>
		{/if}
	</div>
</div>
