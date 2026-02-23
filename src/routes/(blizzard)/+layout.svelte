<script lang="ts">
  import '../../app.css';
  import logo from '$lib/assets/gw-logo-med.png';

  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { env as publicEnv } from '$env/dynamic/public';
  import { setAppEnvContext } from '$lib/contexts/appEnv';
  import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
  import { getBrowserAuthAdapter } from '$lib/infrastructure/auth/browserAuth';
  import { getBrowserSyncManager } from '$lib/infrastructure/sync/browserSyncManager';
  import { getBrowserGoogleSheetsSyncManager } from '$lib/infrastructure/sync';
  import { BrowserClipboardAdapter } from '$lib/infrastructure/clipboard';
  import { GoogleSheetsAdapter } from '$lib/infrastructure/sheets';
  import { syncSettings } from '$lib/stores/syncSettings.svelte';
  import { OfflineBanner } from '$lib/components/ui';

  const { children } = $props();

  let authAdapter: ReturnType<typeof getBrowserAuthAdapter> | null = null;
  let syncManager: ReturnType<typeof getBrowserSyncManager> | null = null;
  let authUnsubscribe: (() => void) | null = null;
  let isAuthenticated = $state(false);

  if (browser) {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });

    authAdapter = getBrowserAuthAdapter({
      navigate: goto,
      clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID
    });
    syncManager = getBrowserSyncManager();

    const sheetsAdapter = authAdapter
      ? new GoogleSheetsAdapter({ authService: authAdapter })
      : undefined;

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
</script>

<div class="flex min-h-screen flex-col bg-gray-50">
  {#if browser}
    <OfflineBanner />
  {/if}

  <header class="border-b bg-white shadow-sm">
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
      <a href="/" class="group flex items-center gap-2">
        <img src={logo} alt="Groupwheel logo" class="h-8 w-8" />
        <p class="text-sm font-semibold tracking-wide text-gray-700 group-hover:text-coral">
          Groupwheel
        </p>
      </a>
    </div>
  </header>

  <main class="flex-1">
    {@render children()}
  </main>
</div>
