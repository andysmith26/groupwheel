<script lang="ts">
	import { onMount } from 'svelte';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

	onMount(() => {
		const env = createInMemoryEnvironment();
		setAppEnvContext(env);
	});
</script>

<slot />
