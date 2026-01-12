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
		hasPreferences = false,
		textTone = 'text-gray-800',
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
		hasPreferences?: boolean;
		textTone?: string;
		onHoverStart?: (studentId: string, x: number, y: number) => void;
		onHoverEnd?: () => void;
	}>();

	const fullName = `${student.firstName} ${student.lastName ?? ''}`.trim() || student.id;
	const gotTopChoice = $derived(preferenceRank === 1);

	function getCompactLabel(firstName: string, lastName: string | null): string {
		const cleanFirst = firstName.trim();
		const lastInitial = (lastName ?? '').trim().charAt(0);
		const truncatedFirst =
			cleanFirst.length > 8 ? `${cleanFirst.slice(0, 8)}...` : cleanFirst;
		if (truncatedFirst && lastInitial) return `${truncatedFirst} ${lastInitial}.`;
		if (truncatedFirst) return truncatedFirst;
		return student.id.slice(0, 2).toUpperCase();
	}

	const compactLabel = $derived(getCompactLabel(student.firstName, student.lastName ?? null));
	const dotClass = $derived(() => {
		if (preferenceRank === 1) return 'bg-green-500';
		if (preferenceRank === 2) return 'bg-yellow-400';
		if (hasPreferences) return 'bg-red-400';
		return '';
	});

	// Hover delay handling (100ms)
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

	function handleMouseEnter(event: MouseEvent) {
		if (isDragging) return;

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = rect.right;
		const y = rect.top;

		hoverTimeout = setTimeout(() => {
			onHoverStart?.(student.id, x, y);
		}, 100);
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
	class={`mx-auto flex items-center justify-center rounded-md border bg-white p-0.5 text-sm shadow-sm transition duration-150 ease-out cursor-grab w-[92px] ${
		selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
	} ${isDragging ? 'opacity-60 cursor-grabbing' : ''} ${flash ? 'flash-move' : ''}`}
	role="button"
	tabindex="0"
	aria-label={fullName}
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
	<div class={`relative flex w-full items-center justify-center rounded-md bg-white px-1.5 py-0.5 text-[15px] font-semibold ${textTone}`}>
		<span class="truncate leading-none">{compactLabel}</span>
		{#if dotClass()}
			<span class={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${dotClass()}`} aria-hidden="true"></span>
		{/if}
	</div>
</div>
