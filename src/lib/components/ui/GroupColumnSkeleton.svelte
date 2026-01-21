<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	const { studentCount = 4 }: { studentCount?: number } = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
	<div class="mb-3 flex items-center justify-between">
		<Skeleton width="60%" height="1rem" />
		<Skeleton width="2rem" height="0.875rem" />
	</div>
	<div class="grid grid-cols-2 gap-1.5">
		{#each Array(studentCount) as _}
			<Skeleton width="100%" height="1.75rem" rounded="md" />
		{/each}
	</div>
</div>
