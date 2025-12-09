<script lang="ts">
	import SaveStatusIndicator from './SaveStatusIndicator.svelte';
	import type { SaveStatus } from '$lib/application/stores/ScenarioEditingStore.svelte';

	const {
		canUndo = false,
		canRedo = false,
		saveStatus = 'idle',
		onUndo,
		onRedo,
		onRegenerate,
		onExit,
		onAdopt,
		onToggleAnalytics,
		analyticsOpen = false,
		metricSummary = '',
		adoptDisabled = false,
		onRetrySave
	} = $props<{
		canUndo?: boolean;
		canRedo?: boolean;
		saveStatus?: SaveStatus;
		onUndo?: () => void;
		onRedo?: () => void;
		onRegenerate?: () => void;
		onExit?: () => void;
		onAdopt?: () => void;
		onToggleAnalytics?: () => void;
		analyticsOpen?: boolean;
		metricSummary?: string;
		adoptDisabled?: boolean;
		onRetrySave?: () => void;
	}>();
</script>

<div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			class="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
			disabled={!canUndo}
			onclick={onUndo}
		>
			← Undo
		</button>
		<button
			type="button"
			class="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
			disabled={!canRedo}
			onclick={onRedo}
		>
			Redo →
		</button>
		{#if metricSummary}
			<span class="ml-2 text-sm font-semibold text-gray-800">{metricSummary}</span>
		{/if}
		<button
			type="button"
			class="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
			onclick={onToggleAnalytics}
		>
			{analyticsOpen ? 'Hide analytics' : 'Show analytics'}
		</button>
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<SaveStatusIndicator status={saveStatus} onRetry={onRetrySave} />
		<button
			type="button"
			class="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
			onclick={onRegenerate}
		>
			Regenerate
		</button>
		<button
			type="button"
			class="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
			onclick={onExit}
		>
			Exit
		</button>
		<button
			type="button"
			class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
			disabled={adoptDisabled}
			onclick={onAdopt}
		>
			Adopt
		</button>
	</div>
</div>
