<script lang="ts">
  import { getStudentLongName, getStudentShortName, type Student, type Tag } from '$lib/domain';
  import type { StudentPeerRequestWorkspaceSummary } from '$lib/application/useCases/getPeerRequestWorkspaceSummary';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { sortableItem, type Edge, type SortableDropState } from '$lib/utils/pragmatic-dnd';
  import { resolveTagBadgeClasses } from '$lib/utils/tagColors';

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
    readonly = false,
    allowedEdges,
    peerRequestSummary = null,
    isPeerRequested = false,
    onOpenStudentDetail,
    tagsById = {}
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
    /** Which edges to use for closest-edge detection. */
    allowedEdges?: Edge[];
    peerRequestSummary?: StudentPeerRequestWorkspaceSummary | null;
    isPeerRequested?: boolean;
    /** Opens the student profile without changing the canvas selection action. */
    onOpenStudentDetail?: (studentId: string) => void;
    tagsById?: Record<string, Tag>;
  }>();

  const fullName = $derived(getStudentLongName(student) || student.id);
  const compactLabel = $derived(
    getStudentShortName(student) || student.id.slice(0, 2).toUpperCase()
  );
  const visibleTagLimit = $derived(uiSettings.cardSize === 'sm' ? 1 : 2);
  const resolvedTags = $derived.by(() =>
    (student.tagIds ?? [])
      .map((tagId: string): Tag | null => tagsById[tagId] ?? null)
      .filter((tag: Tag | null): tag is Tag => tag !== null)
  );
  const visibleTags = $derived(resolvedTags.slice(0, visibleTagLimit));
  const hiddenTagCount = $derived(Math.max(0, resolvedTags.length - visibleTags.length));
  const hiddenTagNames = $derived(resolvedTags.slice(visibleTagLimit).map((tag: Tag) => tag.name));
  const tagSummary = $derived(
    resolvedTags.length ? `. Tags: ${resolvedTags.map((tag: Tag) => tag.name).join(', ')}.` : ''
  );

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
  const finalizedPeerRequestCount = $derived(peerRequestSummary?.confirmedRequestCount ?? 0);
  const satisfiedPeerRequestCount = $derived(
    finalizedPeerRequestCount > 0
      ? Math.min(peerRequestSummary?.satisfiedCount ?? 0, finalizedPeerRequestCount)
      : 0
  );
  const peerRequestProgressDescription = $derived(
    finalizedPeerRequestCount === 0
      ? 'No peer requests.'
      : `${satisfiedPeerRequestCount} of ${finalizedPeerRequestCount} peer requests met.`
  );
  const hasPeerRequestDetails = $derived(Boolean(onOpenStudentDetail));
  const profileButtonToneClass = $derived.by(() => {
    if (finalizedPeerRequestCount === 0) return 'bg-slate-400';
    if (satisfiedPeerRequestCount > 0) return 'bg-emerald-600';
    return 'bg-rose-500';
  });
  const selectedCardClass = $derived.by(() => {
    if (readonly || !isSelected) return '';
    if (isPickedUp) return 'border-blue-500 shadow-md ring-2 ring-blue-500 ring-offset-1';
    return 'border-yellow-400 bg-yellow-50 ring-3 ring-yellow-400 ring-offset-1 shadow-[0_0_0_2px_rgba(234,179,8,0.5)]';
  });
  const peerRequestHighlightClass = $derived(
    isPeerRequested && !isSelected && !isPickedUp
      ? 'border-blue-700 bg-blue-100 ring-2 ring-blue-600/90 ring-offset-2 shadow-[0_0_0_1px_rgba(29,78,216,0.32),0_0_0_7px_rgba(96,165,250,0.20),0_0_28px_10px_rgba(37,99,235,0.34)] scale-[1.03]'
      : ''
  );

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

  function handleClick(event: MouseEvent) {
    if (didDrag) {
      didDrag = false;
      return;
    }
    if (isPickedUp) return;
    if (onStudentClick) {
      event.stopPropagation();
      onStudentClick(student.id);
    }
  }

  function handleOpenStudentDetail(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
    onOpenStudentDetail?.(student.id);
  }

  function handleEdgeChange(edge: Edge | null) {
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
    allowedEdges,
    callbacks: {
      onDragStart: handleDragStartInternal,
      onDragEnd,
      onEdgeChange: handleEdgeChange,
      onDrop: onItemDrop
    }
  }}
  tabindex={readonly ? (onStudentClick ? 0 : -1) : 0}
  role={readonly ? (onStudentClick ? 'button' : undefined) : 'button'}
  aria-label="{fullName}{tagSummary}{readonly
    ? onStudentClick
      ? '. Click to view profile.'
      : ''
    : isPickedUp
      ? '. Press arrow keys to move, Enter to drop, Escape to cancel.'
      : '. Press Enter to pick up.'}"
  aria-pressed={readonly ? undefined : isPickedUp}
  data-student-id={student.id}
  style="width: var(--card-width, 136px); height: var(--card-height, 60px); padding: var(--card-padding, 2px);"
  class={`group relative mx-auto flex flex-col overflow-visible rounded-md border text-sm shadow-sm transition duration-150 ease-out ${!peerRequestHighlightClass && !selectedCardClass ? 'bg-white' : ''} ${
    readonly
      ? onStudentClick
        ? 'cursor-pointer border-gray-200 hover:border-gray-300 hover:shadow'
        : 'cursor-default border-gray-200'
      : 'cursor-grab'
  } ${selectedCardClass || 'border-gray-200'} ${peerRequestHighlightClass} ${!readonly && isDragging ? 'cursor-grabbing opacity-60' : ''} ${flash ? 'flash-move' : ''} ${!readonly || onStudentClick ? 'focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1 focus-visible:outline-none' : ''}`}
  onmouseenter={readonly ? undefined : handleMouseEnter}
  onmouseleave={readonly ? undefined : handleMouseLeave}
  onkeydown={readonly ? undefined : handleKeydown}
  onclick={readonly
    ? onStudentClick
      ? () => onStudentClick?.(student.id)
      : undefined
    : handleClick}
>
  <div class="flex min-w-0 flex-1 items-center gap-1">
    <span class="group/profile relative shrink-0">
      <button
        type="button"
        class={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-[filter,box-shadow,transform] duration-150 ease-out ${profileButtonToneClass} ${
          hasPeerRequestDetails
            ? 'cursor-pointer hover:brightness-95 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1 focus-visible:outline-none'
            : 'cursor-default opacity-70'
        }`}
        aria-label={`View ${fullName}'s details. ${peerRequestProgressDescription}`}
        disabled={!hasPeerRequestDetails}
        onpointerdown={(event) => event.stopPropagation()}
        onclick={hasPeerRequestDetails ? handleOpenStudentDetail : undefined}
        onkeydown={(event) => event.stopPropagation()}
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      </button>
      <span
        role="tooltip"
        class="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-1 w-max max-w-48 rounded bg-gray-900 px-2 py-1 text-[11px] leading-tight font-medium text-white opacity-0 shadow transition-opacity group-focus-within/profile:visible group-focus-within/profile:opacity-100 group-hover/profile:visible group-hover/profile:opacity-100"
      >
        {peerRequestProgressDescription}
      </span>
    </span>
    <div
      style="font-size: var(--card-font-size, 15px);"
      class={`relative min-w-0 flex-1 overflow-visible rounded-md bg-transparent px-1 py-0 font-semibold ${textTone}`}
    >
      <span class="block truncate text-left leading-none" title={fullName}>{compactLabel}</span>
      {#if hasPreferences && badgeText}
        <span
          class={`absolute -top-2 -left-0.5 z-10 rounded px-0.5 text-[9px] leading-tight font-bold ${badgeClass}`}
          aria-label={badgeAriaLabel}
        >
          {badgeText}
        </span>
      {/if}
    </div>
  </div>

  <div class="flex h-5 min-w-0 items-center gap-1 px-1" aria-label={tagSummary || undefined}>
    {#each visibleTags as tag (tag.id)}
      <span
        class="max-w-[45%] min-w-0 truncate rounded px-1.5 py-0.5 text-[10px] leading-none font-medium {resolveTagBadgeClasses(tag)}"
        title={tag.name}
      >
        {tag.name}
      </span>
    {/each}
    {#if hiddenTagCount > 0}
      <span
        class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none font-medium text-slate-500"
        title={hiddenTagNames.join(', ')}
      >
        +{hiddenTagCount}
      </span>
    {/if}
  </div>
</div>
