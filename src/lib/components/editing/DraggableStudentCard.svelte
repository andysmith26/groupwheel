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
		onHoverEnd,
		preferences = [],
		currentGroupName = null
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
		/** First two preference group names */
		preferences?: string[];
		/** Current group name (to show checkmark if matching a preference) */
		currentGroupName?: string | null;
	}>();

	const name = `${student.firstName} ${student.lastName ?? ''}`.trim() || student.id;
	const gotTopChoice = $derived(preferenceRank === 1);

	// Get first and second choices
	const firstChoice = $derived(preferences[0] ?? null);
	const secondChoice = $derived(preferences[1] ?? null);

	// Check if current group matches a preference
	const isInFirstChoice = $derived(
		currentGroupName !== null && firstChoice !== null && currentGroupName === firstChoice
	);
	const isInSecondChoice = $derived(
		currentGroupName !== null && secondChoice !== null && currentGroupName === secondChoice
	);

	// Whether to show preference row
	const hasPreferences = $derived(firstChoice !== null || secondChoice !== null);

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
	{#if hasPreferences}
		<div class="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-500">
			{#if firstChoice}
				<span class={isInFirstChoice ? 'text-green-600 font-medium' : ''}>
					1st: {firstChoice}{#if isInFirstChoice}<span class="ml-0.5">✓</span>{/if}
				</span>
			{/if}
			{#if secondChoice}
				<span class={isInSecondChoice ? 'text-teal-600 font-medium' : ''}>
					2nd: {secondChoice}{#if isInSecondChoice}<span class="ml-0.5">✓</span>{/if}
				</span>
			{/if}
		</div>
	{/if}
</div>
