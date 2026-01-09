<script lang="ts">
	import '../app.css';
	import logo from '$lib/assets/logo.svg';

	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env as publicEnv } from '$env/dynamic/public';
	import { setAppEnvContext } from '$lib/contexts/appEnv';
	import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
	import { getBrowserAuthAdapter } from '$lib/infrastructure/auth/browserAuth';
	import { getBrowserSyncManager } from '$lib/infrastructure/sync/browserSyncManager';
	import { getBrowserGoogleSheetsSyncManager } from '$lib/infrastructure/sync';
	import { BrowserClipboardAdapter } from '$lib/infrastructure/clipboard';
	import { GoogleSheetsAdapter } from '$lib/infrastructure/sheets';
	import { syncSettings } from '$lib/stores/syncSettings.svelte';
	import LoginButton from '$lib/components/auth/LoginButton.svelte';
	import SyncStatus from '$lib/components/sync/SyncStatus.svelte';
	import { OfflineBanner } from '$lib/components/ui';

	const { children } = $props();

	let authAdapter: ReturnType<typeof getBrowserAuthAdapter> | null = null;
	let syncManager: ReturnType<typeof getBrowserSyncManager> | null = null;
	let authUnsubscribe: (() => void) | null = null;
	let isAuthenticated = $state(false);

	if (browser) {
		// Catch unhandled promise rejections to prevent silent failures
		window.addEventListener('unhandledrejection', (event) => {
			console.error('Unhandled promise rejection:', event.reason);
			event.preventDefault();
		});

		authAdapter = getBrowserAuthAdapter({
			navigate: goto,
			clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID
		});
		syncManager = getBrowserSyncManager();

		// Create GoogleSheetsAdapter if auth is available
		const sheetsAdapter = authAdapter
			? new GoogleSheetsAdapter({ authService: authAdapter })
			: undefined;

		// Create GoogleSheetsSyncManager if auth and sheets are available
		const sheetsSyncManager =
			authAdapter && sheetsAdapter
				? getBrowserGoogleSheetsSyncManager({
						sheetsService: sheetsAdapter,
						authService: authAdapter
					})
				: null;

		const appEnv = createInMemoryEnvironment(undefined, {
			useIndexedDb: true,
			authService: authAdapter ?? undefined,
			syncService: syncManager ?? undefined,
			sheetsSyncService: sheetsSyncManager ?? undefined,
			clipboard: new BrowserClipboardAdapter(),
			sheetsService: sheetsAdapter
		});
		setAppEnvContext(appEnv);

		// Subscribe to auth state changes; sync enablement is gated by user preference.
		if (authAdapter) {
			authUnsubscribe = authAdapter.onAuthStateChange((user) => {
				isAuthenticated = user !== null;
			});
		}
	}

	$effect(() => {
		if (!syncManager) return;
		syncManager.setEnabled(isAuthenticated && syncSettings.syncEnabled);
	});

	onDestroy(() => {
		authUnsubscribe?.();
	});

	// Check if we're on the landing page or auth pages
	let isLandingPage = $derived($page.url.pathname === '/');
	let isAuthPage = $derived($page.url.pathname.startsWith('/auth'));

	function isActiveLink(pathname: string, href: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<div class="min-h-screen bg-gray-50">
	{#if browser}
		<OfflineBanner />
	{/if}
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
						href="/activities"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActiveLink(
							$page.url.pathname,
							'/activities'
						) || isActiveLink($page.url.pathname, '/groups')
							? 'bg-teal/10 text-teal'
							: 'text-gray-700 hover:bg-gray-100 hover:text-coral'}"
						aria-current={isActiveLink($page.url.pathname, '/activities') ? 'page' : undefined}
					>
						Activities
					</a>
					<a
						href="/track-responses"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActiveLink(
							$page.url.pathname,
							'/track-responses'
						)
							? 'bg-teal/10 text-teal'
							: 'text-gray-700 hover:bg-gray-100 hover:text-coral'}"
						aria-current={isActiveLink($page.url.pathname, '/track-responses') ? 'page' : undefined}
					>
						Track Responses
					</a>

					<div class="flex items-center gap-3 border-l pl-4">
						{#if browser}
							<SyncStatus />
							<a
								href="/settings"
								class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
								title="Settings"
								aria-label="Settings"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</a>
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

	<main class={$page.route.id?.startsWith('/groups/[id]') || $page.route.id?.startsWith('/activities/[id]') ? '' : 'mx-auto max-w-6xl p-4'}>
		{@render children()}
	</main>
</div>
