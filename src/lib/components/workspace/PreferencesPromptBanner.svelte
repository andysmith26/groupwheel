<script lang="ts">
	/**
	 * PreferencesPromptBanner.svelte
	 *
	 * Prompts users to import student preferences after creating groups.
	 * Features:
	 * - "Import Now" button to open preferences modal
	 * - "Maybe Later" dismisses for current session only
	 * - Close (×) dismisses permanently via localStorage
	 */

	interface Props {
		activityId: string;
		onImportClick: () => void;
	}

	const { activityId, onImportClick }: Props = $props();

	// Session-level dismissal (resets on page refresh)
	let dismissedForSession = $state(false);

	// Check localStorage for permanent dismissal
	const storageKey = `groupwheel:prefs-banner-dismissed:${activityId}`;
	let permanentlyDismissed = $state(false);

	// Check localStorage on mount
	$effect(() => {
		if (typeof window !== 'undefined') {
			permanentlyDismissed = localStorage.getItem(storageKey) === 'true';
		}
	});

	function dismissForSession() {
		dismissedForSession = true;
	}

	function dismissPermanently() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(storageKey, 'true');
		}
		permanentlyDismissed = true;
	}

	let shouldShow = $derived(!dismissedForSession && !permanentlyDismissed);
</script>

{#if shouldShow}
	<div class="rounded-lg border border-purple-200 bg-purple-50 p-4">
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-start gap-3">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 flex-shrink-0">
					<svg class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-medium text-purple-900">
						Have student preferences?
					</h3>
					<p class="mt-1 text-sm text-purple-700">
						Import partner choices or group preferences to help the algorithm make smarter placements when you regenerate.
					</p>
				</div>
			</div>

			<button
				type="button"
				onclick={dismissPermanently}
				class="flex-shrink-0 rounded p-1 text-purple-400 hover:bg-purple-100 hover:text-purple-600"
				aria-label="Dismiss permanently"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="mt-3 flex items-center gap-3">
			<button
				type="button"
				class="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
				onclick={onImportClick}
			>
				<svg class="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
				Import Preferences
			</button>

			<button
				type="button"
				class="text-sm text-purple-600 hover:text-purple-800"
				onclick={dismissForSession}
			>
				Maybe later
			</button>
		</div>
	</div>
{/if}
