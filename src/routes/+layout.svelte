<script lang="ts">
  import '../app.css';
  import logo from '$lib/assets/gw-logo-med.png';

  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { setAppEnvContext } from '$lib/contexts/appEnv';
  import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
  import { getBrowserSyncManager } from '$lib/infrastructure/sync/browserSyncManager';
  import { BrowserClipboardAdapter } from '$lib/infrastructure/clipboard';
  import TrackResponsesNavControls from '$lib/components/track-responses/TrackResponsesNavControls.svelte';
  import { trackResponsesSession } from '$lib/stores/trackResponsesSession.svelte';
  import { OfflineBanner, ToastContainer } from '$lib/components/ui';
  import { devTools } from '$lib/stores/devTools.svelte';
  import {
    initializeDemoModeIfRequested,
    exposeDemoFunctionsToWindow,
    exposeTestFixturesToWindow,
    printConsoleDirectory,
    seedDemoData
  } from '$lib/infrastructure/demo';

  const { children } = $props();

  let syncManager: ReturnType<typeof getBrowserSyncManager> | null = null;
  let appEnvRef: ReturnType<typeof createInMemoryEnvironment> | null = null;

  if (browser) {
    // Catch unhandled promise rejections to prevent silent failures
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });

    syncManager = getBrowserSyncManager();

    const appEnv = createInMemoryEnvironment(undefined, {
      useIndexedDb: true,
      authService: undefined,
      syncService: syncManager ?? undefined,
      sheetsSyncService: undefined,
      clipboard: new BrowserClipboardAdapter(),
      sheetsService: undefined
    });
    appEnvRef = appEnv;
    setAppEnvContext(appEnv);

    // Initialize demo mode if requested via URL parameter (?demo=true)
    initializeDemoModeIfRequested(appEnv).then((result) => {
      if (result) {
        console.log('[Demo]', result.message);
      }
    });

    // Expose demo + test fixture functions to window for developer access
    exposeDemoFunctionsToWindow(appEnv);
    exposeTestFixturesToWindow(appEnv);
    printConsoleDirectory();
  }

  $effect(() => {
    if (!syncManager) return;
    // Auth is disabled for now, so cloud sync stays off.
    syncManager.setEnabled(false);
  });

  let isAuthPage = $derived($page.url.pathname.startsWith('/auth'));
  let isTrackResponses = $derived($page.url.pathname.startsWith('/track-responses'));
  let isClassView = $derived($page.route.id?.startsWith('/activity/[id]') ?? false);
  let isDisplayRoute = $derived($page.route.id === '/activity/[id]/display');
  let hideChrome = $derived(isClassView || isDisplayRoute);

  function handleKeydown(event: KeyboardEvent) {
    // Demo mode shortcut: Ctrl+Shift+D (when devtools enabled)
    if (devTools.enabled && event.ctrlKey && event.shiftKey && event.code === 'KeyD') {
      event.preventDefault();
      if (appEnvRef) {
        seedDemoData(appEnvRef, true).then((result) => {
          console.log('[Demo]', result.message);
          if (result.success) {
            window.location.href = '/';
          }
        });
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex min-h-screen flex-col bg-gray-50">
  {#if browser}
    <OfflineBanner />
  {/if}
  {#if !hideChrome}
    <header class={`border-b bg-white shadow-sm ${isTrackResponses ? 'sticky top-0 z-40' : ''}`}>
      <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
        <a href="/" class="group flex items-center gap-2">
          <img src={logo} alt="Groupwheel logo" class="header-logo-mark h-10 w-10" />
          <div>
            <p class="text-lg font-semibold tracking-wide text-gray-700 group-hover:text-coral">
              Groupwheel
            </p>
            {#if isTrackResponses}
              <p class="text-xs text-gray-500">
                {trackResponsesSession.sheetTitle ?? 'No sheet connected'}
              </p>
            {/if}
          </div>
        </a>

        {#if !isAuthPage}
          <nav aria-label="Main navigation" class="flex flex-1 items-center gap-4">
            {#if isTrackResponses && trackResponsesSession.isConnected}
              <TrackResponsesNavControls />
            {/if}
          </nav>

          <a
            href="/settings"
            class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Settings"
            title="Settings"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </a>
        {/if}
      </div>
    </header>
  {/if}

  <main class={hideChrome ? 'flex-1 overflow-hidden' : 'mx-auto max-w-6xl flex-1 p-4'}>
    {@render children()}
  </main>

  {#if !hideChrome}
    <footer class="border-t bg-white">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-xs text-gray-500"
      >
        <p>© {new Date().getFullYear()} Groupwheel</p>
        <nav aria-label="Legal">
          <a href="/privacy" class="hover:text-coral hover:underline">Privacy</a>
        </nav>
      </div>
    </footer>
  {/if}

  {#if browser}
    <ToastContainer />
  {/if}
</div>

<style>
  .header-logo-mark {
    animation: header-logo-swim 12s ease-in-out infinite;
    filter: saturate(1.03);
    transform-origin: center;
  }

  .group:hover .header-logo-mark {
    animation-duration: 8s;
  }

  @keyframes header-logo-swim {
    0%,
    100% {
      filter: hue-rotate(0deg) saturate(1.02) brightness(1)
        drop-shadow(0 0 0.25rem rgb(42 157 143 / 0.12));
    }

    35% {
      filter: hue-rotate(-8deg) saturate(1.08) brightness(1.02)
        drop-shadow(0 0 0.35rem rgb(224 90 58 / 0.16));
    }

    70% {
      filter: hue-rotate(7deg) saturate(1.06) brightness(1.01)
        drop-shadow(0 0 0.35rem rgb(42 157 143 / 0.16));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .header-logo-mark {
      animation: none;
      filter: none;
    }
  }
</style>
