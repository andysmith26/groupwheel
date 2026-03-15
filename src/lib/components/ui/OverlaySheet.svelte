<script lang="ts">
  /**
   * OverlaySheet — Shared slide-in overlay panel with scrim.
   *
   * Used for roster drawer (left) and student detail sheet (right).
   * >= 1024px: Side drawer (left or right)
   * < 1024px: Full-width bottom sheet
   */

  import { fly, fade } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    side: 'left' | 'right';
    width?: string;
    onClose: () => void;
    children: Snippet;
  }

  let {
    open,
    side,
    width = 'w-64',
    onClose,
    children,
  }: Props = $props();

  let isDesktop = $state(true);

  $effect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    isDesktop = mql.matches;
    function handleChange(e: MediaQueryListEvent) {
      isDesktop = e.matches;
    }
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  });

  let flyX = $derived(side === 'left' ? -320 : 320);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Scrim -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-30"
    transition:fade={{ duration: 200 }}
    onclick={onClose}
  >
    <div class="h-full w-full bg-black/10"></div>
  </div>

  {#if isDesktop}
    <!-- Side drawer (desktop) -->
    <div
      class="fixed top-0 bottom-0 z-40 {side === 'left' ? 'left-0' : 'right-0'} {width} border-{side === 'left' ? 'r' : 'l'} border-gray-200 bg-white shadow-xl"
      transition:fly={{ x: flyX, duration: 250, opacity: 1 }}
      role="dialog"
      aria-modal="true"
    >
      {@render children()}
    </div>
  {:else}
    <!-- Bottom sheet (mobile/tablet) -->
    <div
      class="fixed right-0 bottom-0 left-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-gray-200 bg-white shadow-xl"
      transition:fly={{ y: 400, duration: 250, opacity: 1 }}
      role="dialog"
      aria-modal="true"
    >
      <!-- Drag handle indicator -->
      <div class="flex justify-center py-2">
        <div class="h-1 w-10 rounded-full bg-gray-300"></div>
      </div>
      {@render children()}
    </div>
  {/if}
{/if}
