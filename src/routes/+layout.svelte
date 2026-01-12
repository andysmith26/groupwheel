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
	import TrackResponsesNavControls from '$lib/components/track-responses/TrackResponsesNavControls.svelte';
	import { trackResponsesSession } from '$lib/stores/trackResponsesSession.svelte';
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
	let isTrackResponses = $derived($page.url.pathname.startsWith('/track-responses'));
	let isWorkspace = $derived($page.route.id?.startsWith('/activities/[id]/workspace') ?? false);

	function isActiveLink(pathname: string, href: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-50">
	{#if browser}
		<OfflineBanner />
	{/if}
	<header
		class={`border-b bg-white shadow-sm ${isTrackResponses ? 'sticky top-0 z-40' : ''}`}
	>
		<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
			<a href="/" class="group flex items-center gap-2">
				<img src={logo} alt="Groupwheel logo" class="h-8 w-8" />
				<div>
					<p
						class="text-sm font-semibold tracking-wide text-gray-700 group-hover:text-coral"
					>
						Groupwheel
					</p>
					{#if !isLandingPage && !isAuthPage}
						<p class="text-xs text-gray-500">
							{trackResponsesSession.sheetTitle ?? 'No sheet connected'}
						</p>
					{/if}
				</div>
			</a>

			{#if !isLandingPage && !isAuthPage}
				<nav aria-label="Main navigation" class="flex flex-1 items-center gap-4">
					{#if isTrackResponses && trackResponsesSession.isConnected}
						<TrackResponsesNavControls />
					{/if}

					<div class="ml-auto flex items-center gap-3">
						{#if browser}
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

	<main
		class={
			isWorkspace
				? 'flex-1 overflow-hidden'
				: $page.route.id?.startsWith('/groups/[id]') || $page.route.id?.startsWith('/activities/[id]')
					? 'flex-1'
					: 'flex-1 mx-auto max-w-6xl p-4'
		}
	>
		{@render children()}
	</main>
</div>
