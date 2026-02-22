<script lang="ts">
  import { uiSettings, type CardSize } from '$lib/stores/uiSettings.svelte';

  const sizes: { value: CardSize; label: string; ariaLabel: string }[] = [
    { value: 'sm', label: 'S', ariaLabel: 'Small cards' },
    { value: 'md', label: 'M', ariaLabel: 'Medium cards' },
    { value: 'lg', label: 'L', ariaLabel: 'Large cards' }
  ];
</script>

<div
  class="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5"
  role="radiogroup"
  aria-label="Card size"
>
  {#each sizes as size}
    <button
      type="button"
      role="radio"
      aria-checked={uiSettings.cardSize === size.value}
      aria-label={size.ariaLabel}
      class={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        uiSettings.cardSize === size.value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
      onclick={() => uiSettings.setCardSize(size.value)}
    >
      {size.label}
    </button>
  {/each}
</div>
