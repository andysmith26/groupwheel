<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/groups', { replaceState: true });
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 p-6">
	<div class="space-y-3 text-center">
		<h1 class="text-2xl font-semibold">Welcome to Groupwheel</h1>
		<p class="text-sm text-gray-600">Redirecting to Activities...</p>
		<a class="text-sm font-medium text-blue-600 underline" href="/groups"> Go to Activities </a>
	</div>
</div>
