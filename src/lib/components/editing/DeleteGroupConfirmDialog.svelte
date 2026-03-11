<script lang="ts">
  /**
   * DeleteGroupConfirmDialog — Confirmation dialog before deleting a group.
   *
   * Shows group name, member count, and what happens to students.
   * Includes a "Don't ask again" checkbox that persists to localStorage.
   */

  import { fade, scale } from 'svelte/transition';
  import { Button } from '$lib/components/ui';

  interface Props {
    groupName: string;
    memberCount: number;
    onConfirm: (dontAskAgain: boolean) => void;
    onCancel: () => void;
  }

  let { groupName, memberCount, onConfirm, onCancel }: Props = $props();

  let dontAskAgain = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  function handleConfirm() {
    onConfirm(dontAskAgain);
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-modal="true"
  aria-label="Delete group confirmation"
  onkeydown={handleKeydown}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
    transition:scale={{ duration: 150, start: 0.95 }}
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-gray-900">Delete "{groupName}"?</h3>
        <p class="mt-1 text-sm text-gray-500">
          {#if memberCount > 0}
            {memberCount} {memberCount === 1 ? 'student' : 'students'} will be moved to unassigned.
          {:else}
            This empty group will be removed.
          {/if}
          You can undo this action.
        </p>
      </div>
    </div>

    <div class="mt-4">
      <label class="flex items-center gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          bind:checked={dontAskAgain}
          class="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        Don't ask me again
      </label>
    </div>

    <div class="mt-4 flex justify-end gap-3">
      <Button variant="ghost" onclick={onCancel}>Cancel</Button>
      <button
        type="button"
        onclick={handleConfirm}
        class="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
      >
        Delete
      </button>
    </div>
  </div>
</div>
