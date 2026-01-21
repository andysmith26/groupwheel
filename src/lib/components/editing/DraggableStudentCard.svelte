<script lang="ts">
	import type { Student } from '$lib/domain';
	import { sortableItem, type Edge, type SortableDropState } from '$lib/utils/pragmatic-dnd';

	export type KeyboardMoveDirection = 'up' | 'down' | 'left' | 'right';

	const {
		student,
		container,
		index = 0,
		isDragging = false,
		onDragStart,
		onDragEnd,
		flash = false,
		preferenceRank = null,
		hasPreferences = false,
		textTone = 'text-gray-800',
		onHoverStart,
		onHoverEnd,
		onEdgeChange,
		onItemDrop,
		isPickedUp = false,
		onKeyboardPickUp,
		onKeyboardDrop,
		onKeyboardCancel,
		onKeyboardMove
	} = $props<{
		student: Student;
		container: string;
		index?: number;
		isDragging?: boolean;
		onDragStart?: () => void;
		onDragEnd?: () => void;
		flash?: boolean;
		preferenceRank?: number | null;
		hasPreferences?: boolean;
		textTone?: string;
		onHoverStart?: (studentId: string, x: number, y: number) => void;
		onHoverEnd?: () => void;
		onEdgeChange?: (edge: Edge | null) => void;
		onItemDrop?: (state: SortableDropState) => void;
		isPickedUp?: boolean;
		onKeyboardPickUp?: (studentId: string, container: string, index: number) => void;
		onKeyboardDrop?: () => void;
		onKeyboardCancel?: () => void;
		onKeyboardMove?: (direction: KeyboardMoveDirection) => void;
	}>();

	const fullName = `${student.firstName} ${student.lastName ?? ''}`.trim() || student.id;
	const gotTopChoice = $derived(preferenceRank === 1);

	function getCompactLabel(firstName: string, lastName: string | null): string {
		const cleanFirst = firstName.trim();
		const lastInitial = (lastName ?? '').trim().charAt(0);
		// Let CSS truncate handle overflow - don't add manual "..."
		if (cleanFirst && lastInitial) return `${cleanFirst} ${lastInitial}.`;
		if (cleanFirst) return cleanFirst;
		return student.id.slice(0, 2).toUpperCase();
	}

	const compactLabel = $derived(getCompactLabel(student.firstName, student.lastName ?? null));

	const dotClass = $derived(() => {
		// Students without preferences always get a hollow dot
		if (!hasPreferences) return 'border border-gray-400 bg-transparent';
		// Students with preferences: grey when unassigned, colored when in a group
		// Note: drag preview handles its own grey dot via pragmatic-dnd custom preview
		if (container === 'unassigned') return 'bg-gray-400';
		// Use muted colors for the original card left behind during drag
		if (isDragging) {
			if (preferenceRank === 1) return 'bg-green-300';
			if (preferenceRank === 2) return 'bg-yellow-300';
			return 'bg-red-300';
		}
		if (preferenceRank === 1) return 'bg-green-500';
		if (preferenceRank === 2) return 'bg-yellow-400';
		return 'bg-red-400';
	});

	// Hover delay handling (100ms)
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
	let currentEdge: Edge | null = null;

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

	function handleEdgeChange(edge: Edge | null) {
		currentEdge = edge;
		onEdgeChange?.(edge);
	}

	function handleKeydown(event: KeyboardEvent) {
		// Handle pick up / drop with Enter or Space
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (isPickedUp) {
				onKeyboardDrop?.();
			} else {
				onKeyboardPickUp?.(student.id, container, index);
			}
			return;
		}

		// Handle cancel with Escape
		if (event.key === 'Escape' && isPickedUp) {
			event.preventDefault();
			onKeyboardCancel?.();
			return;
		}

		// Handle movement with arrow keys (only when picked up)
		if (isPickedUp) {
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				onKeyboardMove?.('up');
			} else if (event.key === 'ArrowDown') {
				event.preventDefault();
				onKeyboardMove?.('down');
			} else if (event.key === 'ArrowLeft') {
				event.preventDefault();
				onKeyboardMove?.('left');
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				onKeyboardMove?.('right');
			}
		}
	}
</script>

<div
	use:sortableItem={{
		container,
		index,
		dragData: { id: student.id },
		callbacks: {
			onDragStart: handleDragStartInternal,
			onDragEnd,
			onEdgeChange: handleEdgeChange,
			onDrop: onItemDrop
		}
	}}
	tabindex="0"
	role="button"
	aria-label="{fullName}. {isPickedUp ? 'Press arrow keys to move, Enter to drop, Escape to cancel.' : 'Press Enter to pick up.'}"
	aria-pressed={isPickedUp}
	data-student-id={student.id}
	class={`group mx-auto flex items-center rounded-md border bg-white p-0.5 text-sm shadow-sm transition duration-150 ease-out cursor-grab w-[112px] ${
		isPickedUp
			? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1 shadow-md'
			: 'border-gray-200'
	} ${isDragging ? 'opacity-60 cursor-grabbing' : ''} ${flash ? 'flash-move' : ''} focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1`}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onkeydown={handleKeydown}
>
	<!-- Drag handle grip icon -->
	<svg
		class="h-2.5 w-2.5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-400"
		viewBox="0 0 10 10"
		fill="currentColor"
		aria-hidden="true"
	>
		<circle cx="2.5" cy="2.5" r="1" />
		<circle cx="2.5" cy="7.5" r="1" />
		<circle cx="7.5" cy="2.5" r="1" />
		<circle cx="7.5" cy="7.5" r="1" />
	</svg>
	<div class={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-white px-0.5 py-0.5 text-[15px] font-semibold ${textTone}`}>
		<span class="truncate leading-none" title={fullName}>{compactLabel}</span>
		{#if dotClass()}
			<span class={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${dotClass()}`} aria-hidden="true"></span>
		{/if}
	</div>
</div>
