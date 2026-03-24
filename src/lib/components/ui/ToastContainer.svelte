<script lang="ts">
  /**
   * ToastContainer — Renders the global toast notification stack.
   *
   * Positioned fixed at bottom-right by default. Each toast slides in,
   * is dismissible, and auto-dismisses per its configured duration.
   *
   * Place once in the root layout.
   */
  import { fly, fade } from 'svelte/transition';
  import { toastStore, type Toast, type ToastVariant } from '$lib/stores/toast.svelte';

  const variantStyles: Record<
    ToastVariant,
    { bg: string; border: string; icon: string; text: string }
  > = {
    error: {
      bg: 'bg-red-50',
      border: 'border-l-4 border-red-400',
      icon: 'text-red-500',
      text: 'text-red-900'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-l-4 border-amber-400',
      icon: 'text-amber-500',
      text: 'text-amber-900'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-l-4 border-blue-400',
      icon: 'text-blue-500',
      text: 'text-blue-900'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-l-4 border-green-400',
      icon: 'text-green-600',
      text: 'text-green-900'
    }
  };

  function handleActionClick(toast: Toast) {
    toast.action?.callback();
    toastStore.dismiss(toast.id);
  }
</script>

{#if toastStore.toasts.length > 0}
  <div
    class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col-reverse gap-2"
    aria-live="polite"
    aria-relevant="additions removals"
  >
    {#each toastStore.toasts as toast (toast.id)}
      {@const s = variantStyles[toast.variant]}
      <div
        class="w-80 rounded-lg border shadow-lg {s.bg} {s.border}"
        role="alert"
        in:fly={{ y: 20, duration: 200 }}
        out:fade={{ duration: 150 }}
      >
        <div class="flex items-start gap-3 p-3">
          <!-- Icon -->
          <div class="flex-shrink-0 pt-0.5 {s.icon}">
            {#if toast.variant === 'error'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            {:else if toast.variant === 'warning'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            {:else if toast.variant === 'info'}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            {:else}
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            {/if}
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium {s.text}">{toast.message}</p>
            {#if toast.subtitle}
              <p class="mt-0.5 text-xs {s.text} opacity-75">{toast.subtitle}</p>
            {/if}
            {#if toast.action}
              <button
                type="button"
                class="mt-1.5 text-xs font-medium underline {s.text} hover:opacity-75"
                onclick={() => handleActionClick(toast)}
              >
                {toast.action.label}
              </button>
            {/if}
          </div>

          <!-- Dismiss button -->
          {#if toast.dismissible}
            <button
              type="button"
              class="flex-shrink-0 rounded p-1 {s.text} opacity-60 hover:opacity-100 focus:ring-2 focus:ring-current focus:outline-none"
              onclick={() => toastStore.dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          {/if}
        </div>

        <!-- Progress bar for auto-dismiss -->
        {#if toast.duration > 0}
          <div class="overflow-hidden rounded-b-lg">
            <div
              class="toast-progress-bar h-0.5 {s.icon}"
              style="animation-duration: {toast.duration}ms"
            ></div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
