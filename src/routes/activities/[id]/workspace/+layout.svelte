<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activityHeader } from '$lib/stores/activityHeader.svelte';
  import { workspaceHeader } from '$lib/stores/workspaceHeader.svelte';

  onDestroy(() => {
    activityHeader.clear();
    workspaceHeader.clear();
  });
</script>

<div data-testid="workspace-shell" class="flex h-full min-h-0 flex-col">
  <slot />
</div>
