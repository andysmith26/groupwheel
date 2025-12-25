<script lang="ts">
	import type { AlgorithmTutorial } from '$lib/content/algorithmTutorials';

	const { tutorial, showHeading = true } = $props<{
		tutorial: AlgorithmTutorial;
		showHeading?: boolean;
	}>();
</script>

<div class="space-y-3">
	{#if showHeading}
		<div>
			<div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Algorithm</div>
			<h3 class="text-lg font-semibold text-gray-900">{tutorial.label}</h3>
		</div>
	{/if}
	<p class="text-sm text-gray-700">{tutorial.summary}</p>
	<p class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
		{tutorial.metaphor}
	</p>
	<div class="space-y-2 text-sm text-gray-700">
		{#each tutorial.details as detail}
			<p>{detail}</p>
		{/each}
	</div>
	<div>
		<div class="text-xs font-semibold uppercase tracking-wide text-slate-400">When to use</div>
		<ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
			{#each tutorial.tips as tip}
				<li>{tip}</li>
			{/each}
		</ul>
	</div>
</div>
