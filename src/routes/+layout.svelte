<script lang="ts">
	import '../app.css';
	import logo from '$lib/assets/logo.svg';

	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env as publicEnv } from '$env/dynamic/public';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
	import { getBrowserAuthAdapter } from '$lib/infrastructure/auth/browserAuth';
	import { getBrowserSyncManager } from '$lib/infrastructure/sync/browserSyncManager';
	import { BrowserClipboardAdapter } from '$lib/infrastructure/clipboard';
	import LoginButton from '$lib/components/auth/LoginButton.svelte';
	import SyncStatus from '$lib/components/sync/SyncStatus.svelte';

	const { children } = $props();

	if (browser) {
		const authAdapter = getBrowserAuthAdapter({
			navigate: goto,
			clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID
		});
		const syncManager = getBrowserSyncManager();

		const appEnv = createInMemoryEnvironment(undefined, {
			useIndexedDb: true,
			authService: authAdapter ?? undefined,
			syncService: syncManager ?? undefined,
			clipboard: new BrowserClipboardAdapter()
		});
		setAppEnvContext(appEnv);

		// Subscribe to auth state changes to enable/disable sync.
		// This handles both initial load (after async init) and subsequent changes.
		if (syncManager && authAdapter) {
			authAdapter.onAuthStateChange((user) => {
				syncManager.setEnabled(user !== null);
			});
		}
	}

	// Check if we're on the landing page or auth pages
	let isLandingPage = $derived($page.url.pathname === '/');
	let isAuthPage = $derived($page.url.pathname.startsWith('/auth'));

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
					{#if !isLandingPage && !isAuthPage}
						<p class="text-xs text-gray-500">Teacher workspace</p>
					{/if}
				</div>
			</a>

			{#if !isLandingPage && !isAuthPage}
				<nav aria-label="Main navigation" class="flex items-center gap-4">
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

					<div class="flex items-center gap-3 border-l pl-4">
						{#if browser}
							<SyncStatus />
							<LoginButton />
						{/if}
					</div>
				</nav>
			{:else if !isAuthPage}
				<div class="flex items-center gap-3">
					{#if browser}
						<LoginButton />
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<main class={$page.route.id?.startsWith('/groups/[id]') ? '' : 'mx-auto max-w-6xl p-4'}>
		{@render children()}
	</main>
</div>
