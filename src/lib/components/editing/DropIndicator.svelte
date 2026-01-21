<script lang="ts">
	/**
	 * Visual indicator showing where a dragged item will be inserted.
	 * Renders as a thin horizontal line with a circle at the left end.
	 */
	const {
		visible = false
	} = $props<{
		visible?: boolean;
	}>();
</script>

{#if visible}
	<div class="drop-indicator">
		<div class="drop-indicator-circle"></div>
		<div class="drop-indicator-line"></div>
	</div>
{/if}

<style>
	.drop-indicator {
		display: flex;
		align-items: center;
		height: 4px;
		width: 100%;
		pointer-events: none;
	}

	.drop-indicator-circle {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: #3b82f6;
		flex-shrink: 0;
	}

	.drop-indicator-line {
		flex: 1;
		height: 2px;
		background-color: #3b82f6;
		border-radius: 1px;
	}
</style>
