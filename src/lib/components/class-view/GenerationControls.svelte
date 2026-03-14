<script lang="ts">
  /**
   * GenerationControls — Assign All + Shuffle buttons.
   *
   * - "Assign All": places unassigned students into groups. Disabled when none unassigned.
   * - "Shuffle": re-runs algorithm on all assigned students. Disabled when 0 assigned.
   */

  interface Props {
    onAssignAll: () => void;
    onShuffle: () => void;
    disabled?: boolean;
    isGenerating?: boolean;
    hasGroups?: boolean;
    unplacedStudentCount?: number;
    assignedStudentCount?: number;
  }

  let {
    onAssignAll,
    onShuffle,
    disabled = false,
    isGenerating = false,
    hasGroups = false,
    unplacedStudentCount = 0,
    assignedStudentCount = 0
  }: Props = $props();

  const assignDisabled = $derived(disabled || isGenerating || unplacedStudentCount === 0);
  const shuffleDisabled = $derived(disabled || isGenerating || assignedStudentCount === 0);
</script>

<div class="flex items-center gap-2">
  {#if hasGroups}
    <button
      type="button"
      class="min-h-[44px] rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
      onclick={onAssignAll}
      disabled={assignDisabled}
    >
      Assign All
    </button>
    <button
      type="button"
      class="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      onclick={onShuffle}
      disabled={shuffleDisabled}
    >
      Shuffle
    </button>
  {/if}
</div>
