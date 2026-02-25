<script lang="ts">
  /**
   * Class View (Blizzard)
   *
   * The product — roster, groups, generation, projection, analytics.
   * Replaces Activity Detail, Workspace, and Live View.
   *
   * See: project definition.md — Decision 2, Part 3 (Class View),
   * WP4 (Core Layout), WP5 (Groups Panel), WP7 (Projection Mode)
   */

  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import ClassView from '$lib/components/class-view/ClassView.svelte';

  let activityId = $derived($page.params.id ?? '');
</script>

{#if browser && activityId}
  {#key activityId}
    <ClassView {activityId} />
  {/key}
{/if}
