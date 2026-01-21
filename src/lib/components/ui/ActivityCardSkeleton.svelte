<script lang="ts">
	import Skeleton from './Skeleton.svelte';
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	<Skeleton width="65%" height="1.25rem" class="mb-2" />
	<Skeleton width="45%" height="0.875rem" class="mb-3" />
	<div class="flex items-center justify-between">
		<Skeleton width="30%" height="0.75rem" />
		<Skeleton width="2rem" height="2rem" rounded="lg" />
	</div>
</div>
