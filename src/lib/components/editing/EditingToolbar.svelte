<script lang="ts">
	import SaveStatusIndicator from './SaveStatusIndicator.svelte';
	import { Button } from '$lib/components/ui';
	import type { SaveStatus } from '$lib/stores/scenarioEditingStore';

	const {
		canUndo = false,
		canRedo = false,
		saveStatus = 'idle',
		lastSavedAt = null,
		onUndo,
		onRedo,
		onStartOver,
		onTryAnother,
		onToggleAnalytics,
		analyticsOpen = false,
		metricSummary = '',
		onRetrySave,
		isRegenerating = false,
		isTryingAnother = false,
		canPublish = false,
		isPublished = false,
		publishedSessionName = '',
		onPublish
	} = $props<{
		canUndo?: boolean;
		canRedo?: boolean;
		saveStatus?: SaveStatus;
		lastSavedAt?: Date | null;
		onUndo?: () => void;
		onRedo?: () => void;
		onStartOver?: () => void;
		onTryAnother?: () => void;
		onToggleAnalytics?: () => void;
		analyticsOpen?: boolean;
		metricSummary?: string;
		onRetrySave?: () => void;
		isRegenerating?: boolean;
		isTryingAnother?: boolean;
		canPublish?: boolean;
		isPublished?: boolean;
		publishedSessionName?: string;
		onPublish?: () => void;
	}>();
</script>

<div
	class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
>
	<div class="flex flex-wrap items-center gap-2">
		<Button variant="ghost" size="sm" disabled={!canUndo} onclick={onUndo}>
			← Undo
		</Button>
		<Button variant="ghost" size="sm" disabled={!canRedo} onclick={onRedo}>
			Redo →
		</Button>
		{#if metricSummary}
			<span class="ml-2 text-sm font-semibold text-gray-800">{metricSummary}</span>
		{/if}
		<button
			type="button"
			class="rounded px-2 py-1 text-xs font-medium text-teal hover:bg-teal-light focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
			onclick={onToggleAnalytics}
		>
			{analyticsOpen ? 'Hide analytics' : 'Show analytics'}
		</button>
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<SaveStatusIndicator status={saveStatus} {lastSavedAt} onRetry={onRetrySave} />
		<Button
			variant="ghost"
			size="sm"
			disabled={isTryingAnother || isRegenerating}
			loading={isTryingAnother}
			onclick={onTryAnother}
		>
			{isTryingAnother ? 'Generating...' : 'Try Another'}
		</Button>
		<Button
			variant="ghost"
			size="sm"
			disabled={isRegenerating || isTryingAnother}
			loading={isRegenerating}
			onclick={onStartOver}
		>
			{isRegenerating ? 'Regenerating...' : 'Start Over'}
		</Button>

		{#if isPublished}
			<span
				class="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800"
				title={publishedSessionName ? `Published as: ${publishedSessionName}` : 'Published'}
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				Published
			</span>
		{:else}
			<Button
				variant="primary"
				disabled={!canPublish || isRegenerating || isTryingAnother}
				onclick={onPublish}
			>
				Publish
			</Button>
		{/if}
	</div>
</div>
