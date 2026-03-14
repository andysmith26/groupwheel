<script lang="ts">
  /**
   * RemoveStudentConfirmDialog — Confirmation dialog before removing a student.
   *
   * Shows student name and explains consequences (removal from roster and group).
   */

  import { fade, scale } from 'svelte/transition';
  import { Button } from '$lib/components/ui';

  interface Props {
    studentName: string;
    isInGroup: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { studentName, isInGroup, onConfirm, onCancel }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-modal="true"
  aria-label="Remove student confirmation"
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
          <path stroke-linecap="round" stroke-linejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-gray-900">Remove "{studentName}"?</h3>
        <p class="mt-1 text-sm text-gray-500">
          {#if isInGroup}
            This student will be removed from their group and from the roster.
          {:else}
            This student will be removed from the roster.
          {/if}
          This cannot be undone.
        </p>
      </div>
    </div>

    <div class="mt-4 flex justify-end gap-3">
      <Button variant="ghost" onclick={onCancel}>Cancel</Button>
      <button
        type="button"
        onclick={onConfirm}
        class="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
      >
        Remove
      </button>
    </div>
  </div>
</div>
