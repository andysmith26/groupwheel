<script lang="ts">
  /**
   * Home Screen — Activity hub and entry point.
   *
   * Shows activity cards with one-tap "Make Groups" shortcut,
   * inline activity creation, and Quick Start.
   *
   * See: project definition.md — Decision 2, Part 3 (Home screen)
   */

  import { browser } from '$app/environment';
  import HubView from '$lib/components/home/HubView.svelte';
</script>

{#if browser}
  <HubView />
{/if}
