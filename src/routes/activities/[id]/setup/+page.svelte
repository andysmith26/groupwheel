<script lang="ts">
	/**
	 * /activities/[id]/setup/+page.svelte
	 *
	 * Redirect to the main activity page.
	 * The setup functionality has been merged into /activities/[id].
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect to main activity page
		goto(`/activities/${$page.params.id}`, { replaceState: true });
	});
</script>

<div class="flex items-center justify-center py-12">
	<p class="text-gray-500">Redirecting...</p>
</div>
