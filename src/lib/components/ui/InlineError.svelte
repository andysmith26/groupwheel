<script lang="ts">
  /**
   * InlineError — Consistent inline error message for form fields.
   *
   * Replaces bare `<p class="text-sm text-red-600">` patterns with a
   * standardized, dismissible error display. Use near form inputs for
   * validation errors.
   */
  import { fade } from 'svelte/transition';

  const {
    message,
    size = 'sm',
    dismissible = false,
    onDismiss
  }: {
    message: string;
    /** 'xs' for tight spaces (sidebars), 'sm' for normal forms */
    size?: 'xs' | 'sm';
    dismissible?: boolean;
    onDismiss?: () => void;
  } = $props();

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm'
  };
</script>

<div
  class="flex items-start gap-1.5 {sizeClasses[size]} text-red-600"
  role="alert"
  transition:fade={{ duration: 150 }}
>
  <svg class="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span class="flex-1">{message}</span>
  {#if dismissible}
    <button
      type="button"
      class="flex-shrink-0 rounded p-0.5 hover:bg-red-50 focus:ring-1 focus:ring-red-400 focus:outline-none"
      onclick={onDismiss}
      aria-label="Dismiss error"
    >
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>
