<script lang="ts">
  /**
   * SortOrderDialog — Asks the user whether to alphabetize students
   * by first name or last name before exporting/printing/copying.
   */

  import { fade, scale } from 'svelte/transition';
  import { Button } from '$lib/components/ui';

  export type SortOrder = 'firstName' | 'lastName';

  interface Props {
    onSelect: (sortOrder: SortOrder) => void;
    onCancel: () => void;
  }

  let { onSelect, onCancel }: Props = $props();

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
  aria-label="Choose sort order"
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
        <svg
          class="h-5 w-5 text-teal-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-4.5L16.5 16.5m0 0L12 12m4.5 4.5V3"
          />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-gray-900">Alphabetize students?</h3>
        <p class="mt-1 text-sm text-gray-500">Choose how to sort students within each group.</p>
      </div>
    </div>

    <div class="mt-5 flex flex-col gap-2">
      <button
        type="button"
        onclick={() => onSelect('lastName')}
        class="flex min-h-[44px] w-full items-center gap-3 rounded-md border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:border-teal-300 hover:bg-teal-50"
      >
        <span class="text-gray-400">A→Z</span>
        By last name
      </button>
      <button
        type="button"
        onclick={() => onSelect('firstName')}
        class="flex min-h-[44px] w-full items-center gap-3 rounded-md border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:border-teal-300 hover:bg-teal-50"
      >
        <span class="text-gray-400">A→Z</span>
        By first name
      </button>
    </div>

    <div class="mt-4 flex justify-end">
      <Button variant="ghost" onclick={onCancel}>Cancel</Button>
    </div>
  </div>
</div>
