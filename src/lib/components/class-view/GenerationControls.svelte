<script lang="ts">
  /**
   * GenerationControls — inline group size stepper, positioned near Make Groups button.
   *
   * See: project definition.md — WP5
   */

  interface Props {
    groupSize: number;
    onGroupSizeChange: (size: number) => void;
    onGenerate: () => void;
    disabled?: boolean;
  }

  let { groupSize, onGroupSizeChange, onGenerate, disabled = false }: Props = $props();

  function handleDecrease() {
    if (groupSize > 2) {
      onGroupSizeChange(groupSize - 1);
    }
  }

  function handleIncrease() {
    if (groupSize < 10) {
      onGroupSizeChange(groupSize + 1);
    }
  }
</script>

<div class="flex items-center gap-3">
  <div class="flex items-center rounded-md border border-gray-300 bg-white shadow-sm">
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-l-md text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
      onclick={handleDecrease}
      disabled={disabled || groupSize <= 2}
      aria-label="Decrease group size"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
      </svg>
    </button>
    <div
      class="flex h-9 w-16 items-center justify-center border-x border-gray-300 text-sm font-medium text-gray-900"
    >
      {groupSize} / grp
    </div>
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-r-md text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
      onclick={handleIncrease}
      disabled={disabled || groupSize >= 10}
      aria-label="Increase group size"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  </div>

  <button
    type="button"
    class="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
    onclick={onGenerate}
    {disabled}
  >
    Make Groups
  </button>
</div>
