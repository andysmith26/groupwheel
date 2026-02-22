<script lang="ts">
	/**
	 * ClassViewToolbar — Activity name, back button, undo/redo, save status.
	 *
	 * See: project definition.md — Part 3 (Class View), WP4
	 */

	import SaveStatusIndicator from '$lib/components/editing/SaveStatusIndicator.svelte';
	import type { SaveStatus } from '$lib/stores/scenarioEditingStore';

	interface Props {
		activityName: string;
		canUndo: boolean;
		canRedo: boolean;
		saveStatus: SaveStatus;
		lastSavedAt: Date | null;
		onUndo: () => void;
		onRedo: () => void;
		onBack: () => void;
		onRetrySave?: () => void;
	}

	let {
		activityName,
		canUndo,
		canRedo,
		saveStatus,
		lastSavedAt,
		onUndo,
		onRedo,
		onBack,
		onRetrySave
	}: Props = $props();
</script>

<div class="flex items-center justify-between border-b bg-white px-4 py-2">
	<div class="flex min-w-0 items-center gap-3">
		<button
			type="button"
			onclick={onBack}
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
			aria-label="Back to Home"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 7.5 12l8.25-7.5" />
			</svg>
		</button>

		<h1 class="min-w-0 truncate text-lg font-semibold text-gray-900">
			{activityName}
		</h1>
	</div>

	<div class="flex items-center gap-2">
		<SaveStatusIndicator status={saveStatus} {lastSavedAt} onRetry={onRetrySave} />

		<div class="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1">
			<button
				type="button"
				onclick={onUndo}
				disabled={!canUndo}
				class="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
				aria-label="Undo"
				title="Undo (Cmd+Z)"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
				</svg>
			</button>
			<button
				type="button"
				onclick={onRedo}
				disabled={!canRedo}
				class="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
				aria-label="Redo"
				title="Redo (Cmd+Shift+Z)"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
				</svg>
			</button>
		</div>
	</div>
</div>
