<script lang="ts">
  /**
   * HistoryPopover — Dropdown showing past published sessions.
   *
   * Anchored to the History button in ClassViewToolbar.
   * Replaces the former HistoryPanel sidebar.
   */

  import type { Session } from '$lib/domain';

  interface Props {
    sessions: Session[];
    viewingSessionId: string | null;
    currentSessionId?: string | null;
    onSelectSession: (sessionId: string | null) => void;
    onClose: () => void;
    onDeleteSession?: (sessionId: string) => void;
    onRenameSession?: (sessionId: string, name: string) => void;
  }

  let {
    sessions,
    viewingSessionId,
    currentSessionId = null,
    onSelectSession,
    onClose,
    onDeleteSession,
    onRenameSession,
  }: Props = $props();

  let popoverEl = $state<HTMLDivElement | null>(null);
  let ready = $state(false);

  // Defer click-outside detection to avoid catching the same click that opened the popover
  $effect(() => {
    const timer = setTimeout(() => { ready = true; }, 0);
    return () => { clearTimeout(timer); ready = false; };
  });

  let publishedSessions = $derived(
    sessions
      .filter((s) => (s.status === 'PUBLISHED' || s.status === 'ARCHIVED') && s.id !== currentSessionId)
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
  );

  // --- Inline rename state ---
  let editingSessionId = $state<string | null>(null);
  let editingName = $state('');
  let editInputEl = $state<HTMLInputElement | null>(null);

  function startRename(session: Session) {
    editingSessionId = session.id;
    editingName = session.name;
    requestAnimationFrame(() => {
      editInputEl?.focus();
      editInputEl?.select();
    });
  }

  function commitRename() {
    if (editingSessionId && editingName.trim() && onRenameSession) {
      onRenameSession(editingSessionId, editingName.trim());
    }
    editingSessionId = null;
  }

  function cancelRename() {
    editingSessionId = null;
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  }

  function formatDate(date: Date): string {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    if (isToday) return 'Today';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function handleSessionClick(sessionId: string) {
    if (viewingSessionId === sessionId) {
      onSelectSession(null);
    } else {
      onSelectSession(sessionId);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !editingSessionId) {
      e.stopPropagation();
      onClose();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (ready && popoverEl && !popoverEl.contains(e.target as Node)) {
      onClose();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={popoverEl}
  class="absolute top-full right-0 z-30 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-xl"
  role="dialog"
  aria-label="Session history"
  onclick={(e) => e.stopPropagation()}
>
  <div class="border-b border-gray-200 px-4 py-3">
    <h3 class="text-sm font-semibold text-gray-900">Past Sessions</h3>
  </div>

  <div class="max-h-80 overflow-y-auto">
    {#if publishedSessions.length > 0}
      <div class="px-4 py-3">
        {#each publishedSessions as session (session.id)}
          {@const isSelected = viewingSessionId === session.id}
          <div
            class="group mb-1 rounded-md text-sm transition-colors {isSelected
              ? 'bg-teal-50'
              : 'hover:bg-gray-50'}"
          >
            <button
              type="button"
              onclick={() => handleSessionClick(session.id)}
              class="flex w-full items-start gap-2 px-2 py-2 text-left"
              aria-current={isSelected ? 'true' : undefined}
            >
              <div class="mt-0.5 h-2 w-2 shrink-0 rounded-full {isSelected ? 'bg-teal-500' : 'bg-gray-300'}"></div>
              <div class="min-w-0 flex-1">
                {#if editingSessionId === session.id}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div onclick={(e) => e.stopPropagation()}>
                    <input
                      bind:this={editInputEl}
                      type="text"
                      bind:value={editingName}
                      onkeydown={handleRenameKeydown}
                      onblur={commitRename}
                      class="w-full rounded border border-teal-300 px-1.5 py-0.5 text-sm font-medium text-gray-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                {:else}
                  <div class="font-medium {isSelected ? 'text-teal-800' : 'text-gray-700'}">
                    {session.name}
                  </div>
                {/if}
                <div class="text-xs text-gray-500">
                  {formatDate(session.startDate)}
                </div>
              </div>
            </button>

            <!-- Action buttons (visible on hover) -->
            <div class="flex items-center justify-end gap-0.5 px-2 pb-1 opacity-0 transition-opacity group-hover:opacity-100">
              {#if onRenameSession}
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); startRename(session); }}
                  class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  aria-label="Rename session"
                  title="Rename"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              {/if}
              {#if onDeleteSession}
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); onDeleteSession!(session.id); }}
                  class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Delete session"
                  title="Delete"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center px-4 py-8 text-center">
        <svg class="mb-2 h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <p class="text-sm text-gray-500">No past sessions</p>
        <p class="mt-1 text-xs text-gray-400">After sharing groups with your class, they'll appear here.</p>
      </div>
    {/if}
  </div>
</div>
