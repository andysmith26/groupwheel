<script lang="ts">
  /**
   * ShuffleConfirmDialog — Confirmation dialog before shuffling all students.
   *
   * Warns the teacher that existing placements will be cleared.
   */

  import { fade, scale } from 'svelte/transition';
  import { Button } from '$lib/components/ui';

  interface Props {
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { onConfirm, onCancel }: Props = $props();

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
  aria-label="Shuffle groups confirmation"
  onkeydown={handleKeydown}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
    transition:scale={{ duration: 150, start: 0.95 }}
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <svg class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-gray-900">Shuffle all students?</h3>
        <p class="mt-1 text-sm text-gray-500">
          This will reassign all students to new groups. Existing placements will be cleared. You can undo this action.
        </p>
      </div>
    </div>

    <div class="mt-4 flex justify-end gap-3">
      <Button variant="ghost" onclick={onCancel}>Cancel</Button>
      <button
        type="button"
        onclick={onConfirm}
        class="rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none"
      >
        Shuffle
      </button>
    </div>
  </div>
</div>
