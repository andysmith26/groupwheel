<script lang="ts">
	import SaveStatusIndicator from './SaveStatusIndicator.svelte';
	import type { SaveStatus } from '$lib/application/stores/ScenarioEditingStore.svelte';

	const {
		canUndo = false,
		canRedo = false,
		saveStatus = 'idle',
		lastSavedAt = null,
		onUndo,
		onRedo,
		onStartOver,
		onToggleAnalytics,
		analyticsOpen = false,
		metricSummary = '',
		onRetrySave,
		isRegenerating = false
	} = $props<{
		canUndo?: boolean;
		canRedo?: boolean;
		saveStatus?: SaveStatus;
		lastSavedAt?: Date | null;
		onUndo?: () => void;
		onRedo?: () => void;
		onStartOver?: () => void;
		onToggleAnalytics?: () => void;
		analyticsOpen?: boolean;
		metricSummary?: string;
		onRetrySave?: () => void;
		isRegenerating?: boolean;
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
		<SaveStatusIndicator status={saveStatus} {lastSavedAt} onRetry={onRetrySave} />
		<button
			type="button"
			class="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
			disabled={isRegenerating}
			onclick={onStartOver}
		>
			{isRegenerating ? 'Regenerating...' : 'Start Over'}
		</button>
	</div>
</div>
