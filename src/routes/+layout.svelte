<script lang="ts">
	import '../app.css';
	import logo from '$lib/assets/logo.svg';

	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

	const { children } = $props();

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
			<a href="/" class="group flex items-center gap-2">
				<img src={logo} alt="Groupwheel logo" class="h-8 w-8" />
				<div>
					<p
						class="text-sm font-semibold tracking-wide text-gray-700 group-hover:text-coral"
					>
						Groupwheel
					</p>
					{#if !isLandingPage}
						<p class="text-xs text-gray-500">Teacher workspace</p>
					{/if}
				</div>
			</a>

			{#if !isLandingPage}
				<nav aria-label="Main navigation">
					<a
						href="/groups"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActiveLink(
							$page.url.pathname,
							'/groups'
						)
							? 'bg-teal/10 text-teal'
							: 'text-gray-700 hover:bg-gray-100 hover:text-coral'}"
						aria-current={isActiveLink($page.url.pathname, '/groups') ? 'page' : undefined}
					>
						Activities
					</a>
				</nav>
			{/if}
		</div>
	</header>

	<main class={$page.route.id?.startsWith('/groups/[id]') ? '' : 'mx-auto max-w-6xl p-4'}>
		{@render children()}
	</main>
</div>
