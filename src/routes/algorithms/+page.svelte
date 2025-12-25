<script lang="ts">
	import { algorithmTutorials } from '$lib/content/algorithmTutorials';
	import AlgorithmTutorialContent from '$lib/components/gallery/AlgorithmTutorialContent.svelte';
</script>

<svelte:head>
	<title>Grouping Algorithms | Groupwheel</title>
</svelte:head>

<div class="min-h-screen bg-slate-50">
	<div class="border-b border-slate-200 bg-white">
		<div class="mx-auto max-w-4xl px-6 py-8">
			<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Guide</div>
			<h1 class="text-3xl font-semibold text-slate-900">Grouping algorithm tutorial</h1>
			<p class="mt-2 text-sm text-slate-600">
				Learn how each candidate option is created and what trade-offs it makes.
			</p>
		</div>
	</div>

	<main class="mx-auto max-w-4xl space-y-6 px-6 py-8">
		{#each algorithmTutorials as tutorial}
			<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<AlgorithmTutorialContent {tutorial} />
			</div>
		{/each}
	</main>
</div>
