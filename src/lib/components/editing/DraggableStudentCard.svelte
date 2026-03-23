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
    isSelected = false,
    onKeyboardPickUp,
    onKeyboardDrop,
    onKeyboardCancel,
    onKeyboardMove,
    onStudentClick,
    readonly = false
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
    /** When true, shows a blue selection border (click-selected in groups). */
    isSelected?: boolean;
    onKeyboardPickUp?: (studentId: string, container: string, index: number) => void;
    onKeyboardDrop?: () => void;
    onKeyboardCancel?: () => void;
    onKeyboardMove?: (direction: KeyboardMoveDirection) => void;
    onStudentClick?: (studentId: string) => void;
    /** When true, suppresses drag, keyboard pick-up, and click interactions. */
    readonly?: boolean;
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

  const badgeText = $derived.by(() => {
    if (!hasPreferences) return '';
    if (container === 'unassigned') return '—';
    if (preferenceRank === null) return '—';
    if (preferenceRank === 1) return '1st';
    if (preferenceRank === 2) return '2nd';
    if (preferenceRank === 3) return '3rd';
    return `${preferenceRank}th`;
  });

  const badgeClass = $derived.by(() => {
    if (!hasPreferences || container === 'unassigned') return 'bg-gray-200 text-gray-500';
    if (preferenceRank === 1) return 'bg-green-100 text-green-700';
    if (preferenceRank === 2) return 'bg-yellow-100 text-yellow-700';
    if (preferenceRank === 3) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  });

  const badgeAriaLabel = $derived(
    preferenceRank !== null
      ? `${preferenceRank === 1 ? '1st' : preferenceRank === 2 ? '2nd' : preferenceRank === 3 ? '3rd' : preferenceRank + 'th'} choice`
      : hasPreferences
        ? 'Not a preferred group'
        : 'No preferences'
  );

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

  // Track whether a drag occurred to distinguish click from drag
  let didDrag = $state(false);

  function handleDragStartInternal() {
    didDrag = true;
    // Cancel any pending hover when drag starts
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    onHoverEnd?.();
    onDragStart?.();
  }

  function handleClick() {
    if (didDrag) {
      didDrag = false;
      return;
    }
    if (isPickedUp) return;
    onStudentClick?.(student.id);
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
    disabled: readonly,
    callbacks: {
      onDragStart: handleDragStartInternal,
      onDragEnd,
      onEdgeChange: handleEdgeChange,
      onDrop: onItemDrop
    }
  }}
  tabindex={readonly ? (onStudentClick ? 0 : -1) : 0}
  role={readonly ? (onStudentClick ? 'button' : undefined) : 'button'}
  aria-label="{fullName}{readonly
    ? onStudentClick
      ? '. Click to view profile.'
      : ''
    : isPickedUp
      ? '. Press arrow keys to move, Enter to drop, Escape to cancel.'
      : '. Press Enter to pick up.'}"
  aria-pressed={readonly ? undefined : isPickedUp}
  data-student-id={student.id}
  style="width: var(--card-width, 112px); padding: var(--card-padding, 2px); min-height: 44px;"
  class={`group mx-auto flex items-center rounded-md border bg-white text-sm shadow-sm transition duration-150 ease-out ${
    readonly
      ? onStudentClick
        ? 'cursor-pointer border-gray-200 hover:border-gray-300 hover:shadow'
        : 'cursor-default border-gray-200'
      : 'cursor-grab'
  } ${
    !readonly && (isPickedUp || isSelected)
      ? 'border-blue-500 shadow-md ring-2 ring-blue-500 ring-offset-1'
      : 'border-gray-200'
  } ${!readonly && isDragging ? 'cursor-grabbing opacity-60' : ''} ${flash ? 'flash-move' : ''} ${!readonly || onStudentClick ? 'focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:outline-none' : ''}`}
  onmouseenter={readonly ? undefined : handleMouseEnter}
  onmouseleave={readonly ? undefined : handleMouseLeave}
  onkeydown={readonly ? undefined : handleKeydown}
  onclick={readonly
    ? onStudentClick
      ? () => onStudentClick?.(student.id)
      : undefined
    : handleClick}
>
  <!-- Drag handle grip icon (hidden in readonly mode) -->
  {#if !readonly}
    <svg
      style="width: var(--grip-size, 10px); height: var(--grip-size, 10px);"
      class="flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-400"
      viewBox="0 0 10 10"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2.5" cy="2.5" r="1" />
      <circle cx="2.5" cy="7.5" r="1" />
      <circle cx="7.5" cy="2.5" r="1" />
      <circle cx="7.5" cy="7.5" r="1" />
    </svg>
  {/if}
  <div
    style="font-size: var(--card-font-size, 15px);"
    class={`relative flex min-w-0 flex-1 items-center justify-center overflow-visible rounded-md bg-white px-0.5 py-0.5 font-semibold ${textTone}`}
  >
    <span class="truncate leading-none" title={fullName}>{compactLabel}</span>
    {#if hasPreferences && badgeText}
      <span
        class={`absolute -top-1 -right-0.5 z-10 rounded px-0.5 text-[9px] leading-tight font-bold ${badgeClass}`}
        aria-label={badgeAriaLabel}
      >
        {badgeText}
      </span>
    {/if}
  </div>
</div>
