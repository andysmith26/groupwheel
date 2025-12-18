<script lang="ts">
	// =============================================================================
	// CONFIGURATION
	// =============================================================================
	interface Config {
		/** Size of each dot in pixels */
		dotSize: number;
		/** Gap between dots in pixels */
		dotGap: number;
		/** Maximum number of dots before collapsing */
		maxDots: number;
		/** Height of the progress bar in pixels */
		barHeight: number;
		/** Width of the progress bar in pixels */
		barWidth: number;
	}

	const DEFAULT_CONFIG: Config = {
		dotSize: 8,
		dotGap: 6,
		maxDots: 10,
		barHeight: 4,
		barWidth: 120
	};

	// =============================================================================
	// PROPS
	// =============================================================================
	const {
		total = 0,
		visible = 1,
		current = 0,
		variant = 'fraction',
		config = {},
		onNavigate
	} = $props<{
		/** Total number of items */
		total?: number;
		/** Number of visible items */
		visible?: number;
		/** Index of first visible item */
		current?: number;
		/** Display variant */
		variant?: 'dots' | 'bar' | 'fraction';
		/** Configuration overrides */
		config?: Partial<Config>;
		/** Callback when user clicks to navigate */
		onNavigate?: (index: number) => void;
	}>();

	// Merge config with defaults
	const cfg = $derived({ ...DEFAULT_CONFIG, ...config });

	// =============================================================================
	// COMPUTED VALUES
	// =============================================================================
	// Number of "pages" or sections
	const pageCount = $derived(Math.max(1, Math.ceil(total / Math.max(1, visible))));
	const currentPage = $derived(Math.min(Math.floor(current / Math.max(1, visible)), pageCount - 1));

	// Progress percentage for bar variant
	const progressPercent = $derived(
		total <= visible ? 100 : Math.min(100, ((current + visible) / total) * 100)
	);

	// For displaying range
	const rangeStart = $derived(Math.min(current + 1, total));
	const rangeEnd = $derived(Math.min(current + visible, total));

	// Should we collapse dots?
	const shouldCollapseDots = $derived(pageCount > cfg.maxDots);

	// =============================================================================
	// NAVIGATION
	// =============================================================================
	function handleDotClick(pageIndex: number) {
		if (onNavigate) {
			onNavigate(pageIndex * visible);
		}
	}
</script>

{#if variant === 'dots'}
	<div
		class="dots-container"
		role="tablist"
		aria-label="Scroll position"
		style:gap="{cfg.dotGap}px"
	>
		{#if shouldCollapseDots}
			<!-- Collapsed dot view for many pages -->
			<span class="page-text">{currentPage + 1} / {pageCount}</span>
		{:else}
			{#each Array(pageCount) as _, i}
				<button
					type="button"
					class="dot"
					class:active={i === currentPage}
					style:width="{cfg.dotSize}px"
					style:height="{cfg.dotSize}px"
					onclick={() => handleDotClick(i)}
					role="tab"
					aria-selected={i === currentPage}
					aria-label="Go to page {i + 1}"
				></button>
			{/each}
		{/if}
	</div>
{:else if variant === 'bar'}
	<div
		class="bar-container"
		role="progressbar"
		aria-valuenow={current}
		aria-valuemin={0}
		aria-valuemax={total}
		aria-label="Scroll progress"
		style:width="{cfg.barWidth}px"
		style:height="{cfg.barHeight}px"
	>
		<div
			class="bar-fill"
			style:width="{progressPercent}%"
		></div>
	</div>
{:else}
	<!-- fraction variant (default) -->
	<div class="fraction-container" aria-live="polite">
		<span class="fraction-text">
			{#if total <= visible}
				{total} {total === 1 ? 'item' : 'items'}
			{:else}
				{rangeStart}–{rangeEnd} of {total}
			{/if}
		</span>
	</div>
{/if}

<style>
	/* Dots variant */
	.dots-container {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dot {
		border-radius: 50%;
		background-color: #d1d5db;
		border: none;
		padding: 0;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			transform 0.15s ease;
	}

	.dot:hover {
		background-color: #9ca3af;
		transform: scale(1.2);
	}

	.dot.active {
		background-color: #6b7280;
	}

	.dot:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.page-text {
		font-size: 12px;
		color: #6b7280;
		font-variant-numeric: tabular-nums;
	}

	/* Bar variant */
	.bar-container {
		background-color: #e5e7eb;
		border-radius: 9999px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		background-color: #6b7280;
		border-radius: 9999px;
		transition: width 0.2s ease;
	}

	/* Fraction variant */
	.fraction-container {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fraction-text {
		font-size: 12px;
		color: #6b7280;
		font-variant-numeric: tabular-nums;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.dot,
		.bar-fill {
			transition: none;
		}
	}
</style>
