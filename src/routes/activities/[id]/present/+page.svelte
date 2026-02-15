<script lang="ts">
	/**
	 * /activities/[id]/present — Redirects to /live.
	 * Kept for backwards compatibility with bookmarks/links.
	 */
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto(`/activities/${$page.params.id}/live`, { replaceState: true });
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<p class="text-gray-500">Redirecting...</p>
</div>
