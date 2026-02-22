<script lang="ts">
  import { uiSettings, type GroupLayout } from '$lib/stores/uiSettings.svelte';

  const options: { value: GroupLayout; label: string; ariaLabel: string; icon: string }[] = [
    {
      value: 'scroll',
      label: 'Scroll',
      ariaLabel: 'Single row with horizontal scroll',
      icon: 'scroll'
    },
    { value: 'wrap', label: 'Wrap', ariaLabel: 'Wrap groups into multiple rows', icon: 'wrap' }
  ];
</script>

<div
  class="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5"
  role="radiogroup"
  aria-label="Group layout"
>
  {#each options as option}
    <button
      type="button"
      role="radio"
      aria-checked={uiSettings.groupLayout === option.value}
      aria-label={option.ariaLabel}
      class={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        uiSettings.groupLayout === option.value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
      onclick={() => uiSettings.setGroupLayout(option.value)}
    >
      {#if option.icon === 'scroll'}
        <!-- Horizontal arrows icon -->
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
        </svg>
      {:else}
        <!-- Wrap/grid icon -->
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      {/if}
      {option.label}
    </button>
  {/each}
</div>
