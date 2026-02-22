<script lang="ts">
  /**
   * RepeatedGroupingHint: Contextual hint for repeated grouping workflow.
   *
   * Appears when:
   * - The activity has at least one published session (meaning user is doing repeated groupings)
   * - The hint hasn't been dismissed for this activity
   *
   * Contains a toggle to enable "avoid recent groupmates" in generation.
   * After dismissal, the toggle remains accessible in a compact form.
   */
  import { hintState } from '$lib/stores/hintState.svelte';
  import ContextualHint from '$lib/components/common/ContextualHint.svelte';

  const {
    activityId,
    checked = false,
    onToggle
  }: {
    activityId: string;
    checked?: boolean;
    onToggle: (checked: boolean) => void;
  } = $props();

  let dismissed = $derived(hintState.isDismissed('repeatedGrouping', activityId));

  function handleDismiss() {
    hintState.dismiss('repeatedGrouping', activityId);
  }

  function handleCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onToggle(target.checked);
  }
</script>

{#if !dismissed}
  <!-- Full hint with explanation -->
  <ContextualHint
    title="Running groups again?"
    icon="lightbulb"
    dismissible={true}
    onDismiss={handleDismiss}
  >
    <p class="mb-3">
      You've run groups before. Enable this to mix things up and avoid repeating recent pairings.
    </p>
    <label class="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
        {checked}
        onchange={handleCheckboxChange}
      />
      <span class="text-sm font-medium text-teal-800">
        Avoid pairing students who were together last time
      </span>
    </label>
  </ContextualHint>
{:else}
  <!-- Compact toggle after dismissal -->
  <label
    class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100"
  >
    <input
      type="checkbox"
      class="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
      {checked}
      onchange={handleCheckboxChange}
    />
    <span class="text-sm text-gray-700"> Different groups than last session </span>
  </label>
{/if}
