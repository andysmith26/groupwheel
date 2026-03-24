<script lang="ts">
  /**
   * NewActivityModal — Modal for creating a new activity with all 3 entry methods.
   *
   * Mirrors the empty-state getting-started layout:
   * 1. Import a file (primary) — via ImportRosterCard
   * 2. Quick demo — via QuickStartCard
   * 3. Start from scratch — via PasteRosterCard
   */

  import { fade, scale } from 'svelte/transition';
  import ImportRosterCard from './ImportRosterCard.svelte';
  import QuickStartCard from './QuickStartCard.svelte';
  import PasteRosterCard from './PasteRosterCard.svelte';

  let {
    open = $bindable(false),
    onCreated
  }: {
    open: boolean;
    onCreated?: (programId: string) => void;
  } = $props();

  let showAlternatives = $state(false);

  function handleCreated(programId: string) {
    open = false;
    showAlternatives = false;
    onCreated?.(programId);
  }

  function handleClose() {
    open = false;
    showAlternatives = false;
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    transition:fade={{ duration: 150 }}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="New activity"
    onclick={(e) => {
      if (e.target === e.currentTarget) handleClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') handleClose();
    }}
  >
    <div
      class="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">New Activity</h3>
        <button
          type="button"
          class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onclick={handleClose}
          aria-label="Close"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="mt-5 space-y-4">
        <!-- Primary: Import a file -->
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <div class="mb-4 flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/15 text-teal"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <h3 class="text-sm font-semibold text-gray-900">Import an activity</h3>
          </div>
          <ImportRosterCard compact onCreated={handleCreated} />
        </div>

        {#if !showAlternatives}
          <div class="flex justify-center">
            <button
              type="button"
              class="text-xs text-gray-400 underline decoration-gray-300 underline-offset-2 transition-colors hover:text-gray-600 hover:decoration-gray-400"
              onclick={() => (showAlternatives = true)}
            >
              Start another way
            </button>
          </div>
        {:else}
          <!-- Quick demo -->
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <div class="mb-4 flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                  />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-900">Quick demo</h3>
            </div>
            <QuickStartCard compact onCreated={handleCreated} />
          </div>

          <!-- Start from scratch -->
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <div class="mb-4 flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-900">Start from scratch</h3>
            </div>
            <PasteRosterCard onCreated={handleCreated} />
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
