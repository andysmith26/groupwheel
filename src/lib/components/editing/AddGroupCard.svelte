<script lang="ts">
	/**
	 * AddGroupCard.svelte
	 *
	 * A card that appears at the end of the group grid, allowing users
	 * to add new groups in the workspace.
	 */

	interface Props {
		onAddGroup: () => void;
	}

	const { onAddGroup }: Props = $props();
</script>

<button
	type="button"
	class="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 transition-colors hover:border-gray-400 hover:bg-gray-100"
	onclick={onAddGroup}
	aria-label="Add new group"
>
	<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
	</svg>
	<span class="text-sm font-medium text-gray-600">Add Group</span>
</button>
