<script lang="ts">
  /**
   * GuidedStepper.svelte
   *
   * Post-wizard guidance bar that walks teachers through
   * the adjust → present flow after initial group generation.
   */

  const {
    currentStep = 1,
    onAdvance,
    onShowToClass,
    onDismiss
  } = $props<{
    currentStep: 1 | 2;
    onAdvance: () => void;
    onShowToClass: () => void;
    onDismiss: () => void;
  }>();

  const steps = [
    {
      label: 'Adjust your groups',
      description: 'Drag students between groups to fine-tune placements.',
      actionLabel: 'Looks good →'
    },
    {
      label: 'Show to class',
      description: 'Ready to present? Show groups to your class.',
      actionLabel: 'Show to Class'
    }
  ] as const;

  let step = $derived(steps[currentStep - 1]);
</script>

<div class="rounded-lg border border-teal-200 bg-teal-50 p-4">
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <!-- Step indicators -->
      <div class="flex items-center gap-1.5">
        {#each [1, 2] as num}
          <div
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium {num ===
            currentStep
              ? 'bg-teal text-white'
              : num < currentStep
                ? 'bg-teal-200 text-teal-800'
                : 'bg-gray-200 text-gray-500'}"
          >
            {#if num < currentStep}
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            {:else}
              {num}
            {/if}
          </div>
          {#if num < 2}
            <div class="h-px w-4 {num < currentStep ? 'bg-teal-300' : 'bg-gray-300'}"></div>
          {/if}
        {/each}
      </div>

      <!-- Step content -->
      <div>
        <p class="font-medium text-teal-900">{step.label}</p>
        <p class="text-sm text-teal-700">{step.description}</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-md {currentStep === 2
          ? 'bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark'
          : 'border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50'}"
        onclick={currentStep === 1 ? onAdvance : onShowToClass}
      >
        {step.actionLabel}
      </button>
      <button
        type="button"
        onclick={onDismiss}
        class="flex-shrink-0 rounded p-1 text-teal-600 hover:bg-teal-100 hover:text-teal-800"
        aria-label="Dismiss guide"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</div>
