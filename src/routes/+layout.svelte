<script lang="ts">
	import '../app.css';

	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

	if (browser) {
		const env = createInMemoryEnvironment();
		setAppEnvContext(env);
	}

	// Check if we're on the landing page
	let isLandingPage = $derived($page.url.pathname === '/');

	function isActiveLink(pathname: string, href: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="border-b bg-white shadow-sm">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
			<a href="/" class="group">
				<p
					class="text-xs font-medium tracking-wide text-gray-500 uppercase group-hover:text-gray-700"
				>
					Groupwheel
				</p>
				{#if !isLandingPage}
					<p class="text-sm text-gray-600">Teacher workspace</p>
				{/if}
			</a>

			{#if !isLandingPage}
				<nav aria-label="Main navigation">
					<a
						href="/groups"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActiveLink(
							$page.url.pathname,
							'/groups'
						)
							? 'bg-blue-100 text-blue-900'
							: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}"
						aria-current={isActiveLink($page.url.pathname, '/groups') ? 'page' : undefined}
					>
						Activities
					</a>
				</nav>
			{/if}
		</div>
	</header>

	<main class={$page.route.id?.startsWith('/groups/[id]') ? '' : 'mx-auto max-w-6xl p-4'}>
		<slot />
	</main>
</div>
