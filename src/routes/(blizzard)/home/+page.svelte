<script lang="ts">
  /**
   * Home Screen (Blizzard)
   *
   * Activity hub and entry point. Shows activity cards with one-tap
   * "Make Groups" shortcut, inline activity creation, and Quick Start.
   *
   * During development, accessible at /home. In WP12 (Route Migration),
   * this moves to / and the old /activities route is removed.
   *
   * See: project definition.md — Decision 2, Part 3 (Home screen),
   * WP1 (Activity Cards), WP2 (Inline Creation), WP3 (Quick Start)
   */

  import HomeScreen from '$lib/components/home/HomeScreen.svelte';
</script>

<HomeScreen />
