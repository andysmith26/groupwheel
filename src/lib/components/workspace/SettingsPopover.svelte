<script lang="ts">
  /**
   * SettingsPopover — Group management and generation settings.
   *
   * Opens upward from the FloatingToolbar gear button.
   * Contains: group count stepper, group management list (rename, delete),
   * add group, and rotation avoidance settings.
   */

  import type { Group } from '$lib/domain';
  import DeleteGroupConfirmDialog from '$lib/components/editing/DeleteGroupConfirmDialog.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';

  interface Props {
    groups: Group[];
    avoidRecentGroupmates: boolean;
    lookbackSessions: number;
    publishedSessionCount: number;
    onToggleAvoidance: (enabled: boolean) => void;
    onLookbackChange: (sessions: number) => void;
    onUpdateGroup: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
    onDeleteGroup: (groupId: string) => void;
    onAddGroup: () => void;
    onClose: () => void;
  }

  let {
    groups,
    avoidRecentGroupmates,
    lookbackSessions,
    publishedSessionCount,
    onToggleAvoidance,
    onLookbackChange,
    onUpdateGroup,
    onDeleteGroup,
    onAddGroup,
    onClose,
  }: Props = $props();

  let popoverEl = $state<HTMLDivElement | null>(null);
  let ready = $state(false);

  // Inline rename state
  let renamingGroupId = $state<string | null>(null);
  let renameValue = $state('');

  // Delete confirmation state
  let groupToDelete = $state<{ id: string; name: string; memberCount: number } | null>(null);

  // Defer click-outside detection to avoid catching the same click that opened the popover
  $effect(() => {
    const timer = setTimeout(() => { ready = true; }, 0);
    return () => { clearTimeout(timer); ready = false; };
  });

  function handleToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    onToggleAvoidance(target.checked);
  }

  function handleLookbackChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onLookbackChange(parseInt(target.value, 10));
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (renamingGroupId) {
        renamingGroupId = null;
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      onClose();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (ready && popoverEl && !popoverEl.contains(e.target as Node)) {
      onClose();
    }
  }

  function startRename(group: Group) {
    renamingGroupId = group.id;
    renameValue = group.name;
  }

  function commitRename() {
    if (renamingGroupId && renameValue.trim()) {
      onUpdateGroup(renamingGroupId, { name: renameValue.trim() });
    }
    renamingGroupId = null;
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      renamingGroupId = null;
    }
  }

  function requestDelete(group: Group) {
    if (uiSettings.skipDeleteGroupConfirm) {
      onDeleteGroup(group.id);
      return;
    }
    groupToDelete = { id: group.id, name: group.name, memberCount: group.memberIds.length };
  }

  function handleConfirmDelete(dontAskAgain: boolean) {
    if (!groupToDelete) return;
    if (dontAskAgain) {
      uiSettings.setSkipDeleteGroupConfirm(true);
    }
    onDeleteGroup(groupToDelete.id);
    groupToDelete = null;
  }

  function handleCancelDelete() {
    groupToDelete = null;
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={popoverEl}
  class="absolute bottom-full left-0 z-30 mb-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl"
  role="dialog"
  aria-label="Generation settings"
  onclick={(e) => e.stopPropagation()}
>
  <div class="border-b border-gray-200 px-4 py-3">
    <h3 class="text-sm font-semibold text-gray-900">Settings</h3>
  </div>

  <div class="max-h-[calc(100vh-120px)] overflow-y-auto">
    <!-- Group Management Section -->
    {#if groups.length > 0}
      <div class="border-b border-gray-200 px-4 py-4">
        <h4 class="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          Manage Groups
        </h4>

        <div class="space-y-1">
          {#each groups as group (group.id)}
            <div class="group/row flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
              <!-- Color dot -->
              <div class="h-3 w-3 shrink-0 rounded-full bg-teal-500" style:background-color={group.colorIndex != null ? ['#0d9488', '#2563eb', '#7c3aed', '#dc2626', '#b45309', '#059669', '#4338ca', '#be185d'][group.colorIndex % 8] : '#0d9488'}></div>

              <!-- Name (editable or static) -->
              {#if renamingGroupId === group.id}
                <input
                  type="text"
                  bind:value={renameValue}
                  onblur={commitRename}
                  onkeydown={handleRenameKeydown}
                  class="min-w-0 flex-1 rounded border border-teal-300 px-1.5 py-0.5 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-teal-500"
                  autofocus
                />
              {:else}
                <span class="min-w-0 flex-1 truncate text-sm text-gray-700">
                  {group.name}
                </span>
              {/if}

              <!-- Member count -->
              <span class="shrink-0 text-xs text-gray-400">{group.memberIds.length}</span>

              <!-- Actions (visible on hover) -->
              <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                <button
                  type="button"
                  onclick={() => startRename(group)}
                  class="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  aria-label="Rename {group.name}"
                  title="Rename"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button
                  type="button"
                  onclick={() => requestDelete(group)}
                  class="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete {group.name}"
                  title="Delete"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>

        <!-- Add Group button -->
        <button
          type="button"
          onclick={onAddGroup}
          class="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Group
        </button>
      </div>
    {/if}

    <!-- Rotation Avoidance Section -->
    <div class="px-4 py-4">
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
        Group Rotation
      </h4>

      <!-- Avoid Recent Groupmates Toggle -->
      <label class="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={avoidRecentGroupmates}
          onchange={handleToggle}
          class="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <div>
          <span class="text-sm font-medium text-gray-900">Avoid recent groupmates</span>
          <p class="mt-0.5 text-xs text-gray-500">
            Students won't be grouped with people they recently worked with.
          </p>
        </div>
      </label>

      <!-- Lookback Window -->
      {#if avoidRecentGroupmates}
        <div class="mt-4 pl-7">
          <label for="lookback-sessions" class="block text-sm font-medium text-gray-700">
            Look back
            <span class="font-semibold text-gray-900">{lookbackSessions}</span>
            {lookbackSessions === 1 ? 'session' : 'sessions'}
          </label>
          <input
            id="lookback-sessions"
            type="range"
            min="1"
            max="10"
            value={lookbackSessions}
            oninput={handleLookbackChange}
            class="mt-2 w-full accent-teal-600"
          />
          <div class="mt-1 flex justify-between text-xs text-gray-400">
            <span>1</span>
            <span>10</span>
          </div>
          {#if publishedSessionCount < 2}
            <p class="mt-2 text-xs text-gray-400">
              Rotation avoidance will take effect after your second session.
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if groupToDelete}
  <DeleteGroupConfirmDialog
    groupName={groupToDelete.name}
    memberCount={groupToDelete.memberCount}
    onConfirm={handleConfirmDelete}
    onCancel={handleCancelDelete}
  />
{/if}
