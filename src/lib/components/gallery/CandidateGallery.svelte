<script lang="ts">
	import type { CandidateGrouping } from '$lib/application/useCases/generateMultipleCandidates';
	import type { Student } from '$lib/domain';
	import CandidateCard from '$lib/components/gallery/CandidateCard.svelte';
	import AlgorithmTutorialContent from '$lib/components/gallery/AlgorithmTutorialContent.svelte';
	import { algorithmTutorialsById } from '$lib/content/algorithmTutorials';

	const {
		candidates = [],
		studentsById,
		selectedId,
		disabled = false,
		onSelect
	} = $props<{
		candidates?: CandidateGrouping[];
		studentsById: Record<string, Student>;
		selectedId?: string | null;
		disabled?: boolean;
		onSelect?: (candidate: CandidateGrouping) => void;
	}>();

	let infoOpen = $state(false);
	let activeTutorialId = $state<string | null>(null);

	function openInfo(candidate: CandidateGrouping) {
		activeTutorialId = candidate.algorithmId;
		infoOpen = true;
	}

	function closeInfo() {
		infoOpen = false;
		activeTutorialId = null;
	}
</script>

<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
	{#each candidates as candidate, index}
		<CandidateCard
			{candidate}
			{studentsById}
			label={`Option ${index + 1}`}
			isSelected={candidate.id === selectedId}
			{disabled}
			onSelect={disabled ? undefined : onSelect}
			onInfo={openInfo}
		/>
	{/each}
</div>

{#if infoOpen}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			{#if activeTutorialId}
				{@const tutorial = algorithmTutorialsById.get(activeTutorialId)}
				{#if tutorial}
					<AlgorithmTutorialContent {tutorial} />
				{:else}
					<h3 class="text-lg font-semibold text-gray-900">Algorithm</h3>
					<p class="mt-2 text-sm text-gray-700">No description available.</p>
				{/if}
			{:else}
				<h3 class="text-lg font-semibold text-gray-900">Algorithm</h3>
				<p class="mt-2 text-sm text-gray-700">No description available.</p>
			{/if}
			<div class="mt-6 flex justify-end">
				<a
					href="/algorithms"
					class="mr-auto text-sm font-semibold text-slate-700 hover:text-slate-900"
				>
					View all algorithms
				</a>
				<button
					type="button"
					class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
					onclick={closeInfo}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
