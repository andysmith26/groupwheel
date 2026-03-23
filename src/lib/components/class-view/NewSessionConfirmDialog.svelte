<script lang="ts">
  /**
   * NewSessionConfirmDialog — Confirmation before clearing groups to start fresh.
   *
   * Reassures the teacher that current groups are saved in history.
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
  aria-label="Start fresh confirmation"
  onkeydown={handleKeydown}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
    transition:scale={{ duration: 150, start: 0.95 }}
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100">
        <svg class="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-gray-900">Start fresh with new groups?</h3>
        <p class="mt-1 text-sm text-gray-500">
          Your current groups are saved in History. You can view them anytime.
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
        Start Fresh
      </button>
    </div>
  </div>
</div>
