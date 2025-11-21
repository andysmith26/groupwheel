<script lang="ts">
	import { onMount } from 'svelte';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

	// We create the environment once on the client.
	// If you later want SSR-aware behavior, we can conditionally build it.
	onMount(() => {
		const env = createInMemoryEnvironment();
		setAppEnvContext(env);
	});
</script>

<slot />
