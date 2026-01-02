<script lang="ts">
	/**
	 * SheetConnector.svelte
	 *
	 * Component for connecting to a Google Sheet.
	 * - Accepts a Google Sheets URL
	 * - Fetches sheet metadata (title, tabs)
	 * - Returns a SheetConnection for use in the wizard
	 */

	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { connectGoogleSheet, isAuthenticated } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { SheetConnection } from '$lib/domain/sheetConnection';

	interface Props {
		/** Callback when a sheet is successfully connected */
		onConnect: (connection: SheetConnection) => void;
		/** Existing connection to display (optional) */
		existingConnection?: SheetConnection | null;
		/** Whether to show a disconnect option */
		allowDisconnect?: boolean;
		/** Callback when user disconnects */
		onDisconnect?: () => void;
	}

	let {
		onConnect,
		existingConnection = null,
		allowDisconnect = false,
		onDisconnect
	}: Props = $props();

	const env = getAppEnvContext();

	// State
	let sheetUrl = $state('');
	let isConnecting = $state(false);
	let error = $state('');

	// Derived
	let isLoggedIn = $derived(isAuthenticated(env));
	let hasConnection = $derived(existingConnection !== null);

	async function handleConnect() {
		if (!sheetUrl.trim()) {
			error = 'Please enter a Google Sheets URL';
			return;
		}

		error = '';
		isConnecting = true;

		const result = await connectGoogleSheet(env, { url: sheetUrl.trim() });

		isConnecting = false;

		if (isErr(result)) {
			switch (result.error.type) {
				case 'NOT_AUTHENTICATED':
					error = 'Please sign in to access Google Sheets';
					break;
				case 'PERMISSION_DENIED':
					error = 'You do not have permission to access this spreadsheet';
					break;
				case 'NOT_FOUND':
					error = 'Spreadsheet not found. Please check the URL.';
					break;
				case 'INVALID_URL':
					error = 'Please enter a valid Google Sheets URL';
					break;
				default:
					error = result.error.message || 'Failed to connect to sheet';
			}
			return;
		}

		onConnect(result.value);
	}

	function handleDisconnect() {
		if (onDisconnect) {
			onDisconnect();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !isConnecting) {
			handleConnect();
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	{#if !isLoggedIn}
		<div class="text-center">
			<p class="mb-2 text-sm text-gray-600">
				Sign in with Google to import from your Google Sheets
			</p>
			<p class="text-xs text-gray-500">
				Your sheets stay private - we only read data you choose to import
			</p>
		</div>
	{:else if hasConnection && existingConnection}
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<svg
						class="h-5 w-5 text-green-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span class="font-medium text-gray-900">Connected</span>
				</div>
				{#if allowDisconnect}
					<button
						type="button"
						onclick={handleDisconnect}
						class="text-sm text-gray-500 hover:text-gray-700"
					>
						Disconnect
					</button>
				{/if}
			</div>
			<div class="rounded-md bg-gray-50 p-3">
				<p class="font-medium text-gray-900">{existingConnection.title}</p>
				<p class="text-sm text-gray-500">
					{existingConnection.tabs.length} tab{existingConnection.tabs.length === 1 ? '' : 's'}
				</p>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<label for="sheet-url" class="block text-sm font-medium text-gray-700">
				Google Sheets URL
			</label>
			<div class="flex gap-2">
				<input
					id="sheet-url"
					type="url"
					bind:value={sheetUrl}
					onkeydown={handleKeydown}
					placeholder="https://docs.google.com/spreadsheets/d/..."
					class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
					disabled={isConnecting}
				/>
				<button
					type="button"
					onclick={handleConnect}
					disabled={isConnecting || !sheetUrl.trim()}
					class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isConnecting}
						<span class="flex items-center gap-2">
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							Connecting...
						</span>
					{:else}
						Connect
					{/if}
				</button>
			</div>

			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}

			<p class="text-xs text-gray-500">
				Paste the URL of your Google Sheet. The sheet must be accessible with your Google account.
			</p>
		</div>
	{/if}
</div>
