<script lang="ts">
	import type { CandidateGrouping } from '$lib/application/useCases/generateMultipleCandidates';
	import type { Student } from '$lib/domain';
	import CandidateCard from '$lib/components/gallery/CandidateCard.svelte';

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
		/>
	{/each}
</div>
