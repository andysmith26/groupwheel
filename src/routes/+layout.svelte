<script lang="ts">
	import { browser } from '$app/environment';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

	if (browser) {
		// This runs during component initialization on the client,
		// before child components execute their <script> blocks.
		const env = createInMemoryEnvironment();
		setAppEnvContext(env);
	}
</script>

<slot />
