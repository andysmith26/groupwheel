<script lang="ts">
  /**
   * FloatingMiniToolbar — a draggable chip that expands into a compact floating
   * mini-toolbar anchored to the chip's right edge.
   *
   * Replaces the full-width ClassViewToolbar overlay on desktop editing mode.
   * Collapses to a small pill showing the activity name + save-status dot.
   */

  import { cubicOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';
  import SettingsPopover from '$lib/components/workspace/SettingsPopover.svelte';
  import ShareDropdown from './ShareDropdown.svelte';
  import type { SaveStatus } from '$lib/stores/scenarioEditingStore';
  import type { Group } from '$lib/domain';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';

  interface Props {
    activityName: string;
    saveStatus: SaveStatus;
    lastSavedAt: Date | null;
    hasGroups: boolean;
    onBack: () => void;
    onRetrySave?: () => void;
    onToggleRoster?: () => void;
    rosterOpen?: boolean;
    onToggleHistory?: () => void;
    historyPanelOpen?: boolean;
    hasHistory?: boolean;
    groups?: Group[];
    avoidRecentGroupmates?: boolean;
    lookbackSessions?: number;
    publishedSessionCount?: number;
    onToggleAvoidance?: (enabled: boolean) => void;
    onLookbackChange?: (sessions: number) => void;
    onEditGroup?: (groupId: string) => void;
    onAddGroup?: () => void;
    onManageTags?: () => void;
    onCopyForSpreadsheet?: () => void;
    onSave?: () => void;
    onPrint?: () => void;
    onDisplay?: () => void;
    onPublish?: () => void;
  }

  const {
    activityName,
    saveStatus,
    lastSavedAt,
    hasGroups,
    onBack,
    onRetrySave,
    onToggleRoster,
    rosterOpen = false,
    onToggleHistory,
    historyPanelOpen = false,
    hasHistory = false,
    groups = [],
    avoidRecentGroupmates = false,
    lookbackSessions = 3,
    publishedSessionCount = 0,
    onToggleAvoidance,
    onLookbackChange,
    onEditGroup,
    onAddGroup,
    onManageTags,
    onCopyForSpreadsheet,
    onSave,
    onPrint,
    onDisplay,
    onPublish
  }: Props = $props();

  // ─── Layout constants ──────────────────────────────────────────────────────
  const CHIP_H = 40;
  const EDGE = 12;

  // ─── Chip drag-to-reposition ───────────────────────────────────────────────
  function defaultPos(): { right: number; y: number } {
    return { right: EDGE, y: 60 };
  }

  function loadPos(): { right: number; y: number } {
    try {
      const stored = localStorage.getItem('groupwheel:toolbar-chip-pos');
      if (stored) {
        const p = JSON.parse(stored) as { right?: number; y?: number };
        if (typeof p.right === 'number' && typeof p.y === 'number')
          return { right: p.right, y: p.y };
      }
    } catch {
      /* ignore */
    }
    return defaultPos();
  }

  let pos = $state<{ right: number; y: number }>(loadPos());
  let dragging = $state(false);
  let didDrag = $state(false);
  let dragStartPtr = { x: 0, y: 0 };
  let dragStartPos = { right: 0, y: 0 };

  // Track viewport width for drag clamping.
  let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1280);
  $effect(() => {
    const handleResize = () => {
      windowWidth = window.innerWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(v, hi));
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    dragging = true;
    didDrag = false;
    dragStartPtr = { x: e.clientX, y: e.clientY };
    dragStartPos = { right: pos.right, y: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStartPtr.x;
    const dy = e.clientY - dragStartPtr.y;
    if (!didDrag && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) didDrag = true;
    if (!didDrag) return;
    pos = {
      right: clamp(dragStartPos.right - dx, EDGE, windowWidth - 80),
      y: clamp(
        dragStartPos.y + dy,
        0,
        (typeof window !== 'undefined' ? window.innerHeight : 768) - CHIP_H
      )
    };
  }

  function handlePointerUp() {
    if (!dragging) return;
    dragging = false;
    if (didDrag) {
      try {
        localStorage.setItem('groupwheel:toolbar-chip-pos', JSON.stringify(pos));
      } catch {
        /* ignore */
      }
    }
  }

  // ─── Dropdown state (settings / share) ────────────────────────────────────
  let settingsOpen = $state(false);
  let shareOpen = $state(false);

  function setMenuOpen(which: 'settings' | 'share', open: boolean) {
    settingsOpen = which === 'settings' ? open : false;
    shareOpen = which === 'share' ? open : false;
  }

  // ─── Hover expand/collapse ─────────────────────────────────────────────────
  let hovering = $state(true);
  let collapseTimer: ReturnType<typeof setTimeout> | null = null;

  // Always stay expanded when there are no groups (nothing to collapse to).
  // Also stay expanded when experimental features are off (collapse is experimental).
  const expanded = $derived(
    !uiSettings.useExperimentalFeatures || !hasGroups || hovering || settingsOpen || shareOpen
  );

  function onMouseEnter() {
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
    hovering = true;
  }

  function onMouseLeave() {
    if (dragging) return;
    collapseTimer = setTimeout(() => {
      hovering = false;
    }, 350);
  }

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      // Alt+Shift+T — toggle
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        hovering = !hovering;
        if (!hovering) {
          settingsOpen = false;
          shareOpen = false;
        }
        return;
      }
      // Escape — close open dropdowns, then collapse toolbar
      if (e.key === 'Escape' && expanded) {
        if (settingsOpen || shareOpen) {
          settingsOpen = false;
          shareOpen = false;
        } else {
          hovering = false;
        }
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // ─── Slide transition ──────────────────────────────────────────────────────
  function slideLeft(
    _node: Element,
    { duration = 180 }: { duration?: number } = {}
  ): TransitionConfig {
    return {
      duration,
      easing: cubicOut,
      css: (t) => `transform: translateX(${(1 - t) * 24}px); opacity: ${t};`
    };
  }

  // ─── Display helpers ───────────────────────────────────────────────────────
  const truncatedName = $derived(
    activityName.length > 22 ? activityName.slice(0, 20) + '…' : activityName
  );

  const dotClass = $derived(
    saveStatus === 'saved'
      ? 'bg-teal-400'
      : saveStatus === 'saving'
        ? 'animate-pulse bg-amber-400'
        : saveStatus === 'error' || saveStatus === 'failed'
          ? 'bg-red-400'
          : 'bg-gray-300'
  );

  const statusTooltip = $derived(
    saveStatus === 'saved'
      ? 'Saved to this device'
      : saveStatus === 'saving'
        ? 'Saving…'
        : saveStatus === 'error' || saveStatus === 'failed'
          ? 'Save failed — click to retry'
          : 'No unsaved changes'
  );
</script>

{#if expanded}
  <!--
    Expanded toolbar: right-anchored; grows leftward on hover.
  -->
  <div
    transition:slideLeft
    class="fixed z-30 flex h-10 items-center rounded-full bg-white shadow-xl ring-2 ring-teal-400 select-none"
    style="right: {pos.right}px; top: {pos.y}px; max-width: calc(100vw - 8px);"
    role="toolbar"
    aria-label="Workspace toolbar"
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
  >
    <!-- Home / back-to-dashboard button -->
    <button
      type="button"
      onclick={onBack}
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
      aria-label="Back to Home"
      title="Back to Home"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    </button>

    <!-- Roster toggle -->
    {#if onToggleRoster}
      <button
        type="button"
        onclick={onToggleRoster}
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors {rosterOpen
          ? 'bg-teal-50 text-teal-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
        aria-label="{rosterOpen ? 'Close' : 'Open'} roster"
        aria-expanded={rosterOpen}
        title="Toggle roster"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      </button>
    {/if}

    {#if hasGroups}
      <div class="mx-0.5 h-5 w-px shrink-0 bg-gray-200"></div>

      <!-- History toggle -->
      {#if uiSettings.useExperimentalFeatures && onToggleHistory}
        <div class="relative">
          <button
            type="button"
            onclick={onToggleHistory}
            class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors {historyPanelOpen
              ? 'bg-teal-50 text-teal-700'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
            aria-label="{historyPanelOpen ? 'Close' : 'Open'} session history"
            aria-expanded={historyPanelOpen}
            title="Session history"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            {#if hasHistory}
              <span class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-500"></span>
            {/if}
          </button>
        </div>
      {/if}

      <!-- Settings gear -->
      <div class="relative">
        <button
          type="button"
          onclick={() => setMenuOpen('settings', !settingsOpen)}
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors {settingsOpen
            ? 'bg-teal-50 text-teal-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
          aria-label="{settingsOpen ? 'Close' : 'Open'} settings"
          aria-expanded={settingsOpen}
          title="Settings"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </button>
        {#if settingsOpen}
          <SettingsPopover
            {groups}
            {avoidRecentGroupmates}
            {lookbackSessions}
            {publishedSessionCount}
            onToggleAvoidance={onToggleAvoidance ?? (() => {})}
            onLookbackChange={onLookbackChange ?? (() => {})}
            onEditGroup={onEditGroup ?? (() => {})}
            onAddGroup={onAddGroup ?? (() => {})}
            onManageTags={onManageTags ?? (() => {})}
            onClose={() => setMenuOpen('settings', false)}
          />
        {/if}
      </div>

      <!-- Export button -->
      <div class="relative">
        <button
          type="button"
          onclick={() => setMenuOpen('share', !shareOpen)}
          class="flex h-8 items-center gap-1 rounded-full px-2.5 text-sm font-medium transition-colors {shareOpen
            ? 'bg-teal-700 text-white'
            : 'bg-teal-600 text-white hover:bg-teal-700'}"
          aria-label="{shareOpen ? 'Close' : 'Open'} export menu"
          aria-expanded={shareOpen}
          aria-haspopup="true"
        >
          Export
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {#if shareOpen}
          <ShareDropdown
            {onCopyForSpreadsheet}
            {onSave}
            {onPrint}
            {onDisplay}
            {onPublish}
            onClose={() => setMenuOpen('share', false)}
          />
        {/if}
      </div>
    {/if}

    <!--
      ── Right section: mirrors the chip exactly ──────────────────────────────
      Collapse button + activity name + status + drag grip.
      The collapse button occupies the same relative position as the chip's
      expand indicator, so the name visually stays put when toggling.
    -->
    <div class="mx-0.5 h-5 w-px shrink-0 bg-gray-200"></div>

    <!-- Activity name + save status dot (mirrors chip layout exactly) -->
    <span class="max-w-[120px] truncate px-1.5 text-sm font-medium text-gray-800"
      >{truncatedName}</span
    >
    {#if (saveStatus === 'error' || saveStatus === 'failed') && onRetrySave}
      <button
        type="button"
        onclick={onRetrySave}
        class="flex shrink-0 cursor-pointer items-center rounded-full p-1 transition-shadow hover:ring-2 hover:ring-red-300"
        title={statusTooltip}
        aria-label={statusTooltip}
      >
        <span class="h-2 w-2 rounded-full {dotClass}"></span>
      </button>
    {:else}
      <span class="h-2 w-2 shrink-0 rounded-full {dotClass}" title={statusTooltip}></span>
    {/if}

    <!-- Drag handle: same far-right position as the chip's grip -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex h-full shrink-0 items-center rounded-r-full pr-2.5 pl-1.5 text-gray-300 hover:text-gray-400 {dragging
        ? 'cursor-grabbing'
        : 'cursor-grab'}"
      style="touch-action: none;"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      role="none"
      aria-hidden="true"
      title="Drag to reposition (Option-Shift-T to toggle)"
    >
      <svg class="h-3 w-2.5" viewBox="0 0 8 12" fill="currentColor" aria-hidden="true">
        <circle cx="2" cy="2" r="1.1" /><circle cx="6" cy="2" r="1.1" />
        <circle cx="2" cy="6" r="1.1" /><circle cx="6" cy="6" r="1.1" />
        <circle cx="2" cy="10" r="1.1" /><circle cx="6" cy="10" r="1.1" />
      </svg>
    </div>
  </div>
{:else}
  <!--
    Collapsed chip: same right edge as the expanded toolbar.
    Hover to expand, drag to reposition.
  -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed z-50 flex h-10 items-center gap-1.5 rounded-full bg-white pr-2.5 pl-2.5 text-sm font-medium text-gray-700 shadow-xl ring-1 ring-black/10 transition-shadow select-none hover:shadow-2xl {dragging
      ? 'cursor-grabbing'
      : 'cursor-grab'}"
    style="right: {pos.right}px; top: {pos.y}px; touch-action: none;"
    data-testid="toolbar-chip"
    title="Workspace toolbar — hover to expand · drag to reposition (Option-Shift-T to toggle)"
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    role="none"
    aria-hidden="true"
  >
    <span class="max-w-[120px] truncate">{truncatedName}</span>
    <span class="h-2 w-2 shrink-0 rounded-full {dotClass}" title={statusTooltip}></span>
    <!-- Grip dots signal "drag to reposition" -->
    <span class="flex shrink-0 items-center">
      <svg
        class="h-3 w-2.5 text-gray-300"
        viewBox="0 0 8 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="2" cy="2" r="1.1" /><circle cx="6" cy="2" r="1.1" />
        <circle cx="2" cy="6" r="1.1" /><circle cx="6" cy="6" r="1.1" />
        <circle cx="2" cy="10" r="1.1" /><circle cx="6" cy="10" r="1.1" />
      </svg>
    </span>
  </div>
{/if}
