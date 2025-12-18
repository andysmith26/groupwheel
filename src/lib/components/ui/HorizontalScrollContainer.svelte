<script lang="ts">
	import { onMount } from 'svelte';
	import ScrollProgressIndicator from './ScrollProgressIndicator.svelte';

	// =============================================================================
	// CONFIGURATION - All magic numbers are configurable via props
	// =============================================================================
	interface Config {
		/** Width of each item in pixels (used to calculate visible count) */
		itemWidth: number;
		/** Gap between items in pixels */
		itemGap: number;
		/** Number of items to scroll per button click */
		scrollItemCount: number;
		/** Width of fade gradients in pixels */
		fadeWidth: number;
		/** Debounce delay for scroll events in ms */
		scrollDebounceMs: number;
		/** Threshold to consider "at edge" in pixels */
		edgeThreshold: number;
	}

	const DEFAULT_CONFIG: Config = {
		itemWidth: 220,
		itemGap: 12,
		scrollItemCount: 3,
		fadeWidth: 40,
		scrollDebounceMs: 50,
		edgeThreshold: 5
	};

	// =============================================================================
	// PROPS
	// =============================================================================
	const {
		totalItems = 0,
		config = {},
		showFades = true,
		showButtons = true,
		showProgress = true,
		progressVariant = 'fraction',
		enableDragScroll = true,
		enableScrollSnap = true,
		enableKeyboardNav = true,
		ariaLabel = 'Scrollable content',
		children
	} = $props<{
		/** Total number of items (for progress indicator) */
		totalItems?: number;
		/** Configuration overrides */
		config?: Partial<Config>;
		/** Show fade gradients on edges */
		showFades?: boolean;
		/** Show navigation buttons */
		showButtons?: boolean;
		/** Show progress indicator */
		showProgress?: boolean;
		/** Progress indicator style: 'dots' | 'bar' | 'fraction' */
		progressVariant?: 'dots' | 'bar' | 'fraction';
		/** Enable drag-to-scroll with mouse */
		enableDragScroll?: boolean;
		/** Enable scroll snap to item boundaries */
		enableScrollSnap?: boolean;
		/** Enable keyboard navigation when focused */
		enableKeyboardNav?: boolean;
		/** Accessible label for the scroll region */
		ariaLabel?: string;
		/** Slot content */
		children?: any;
	}>();

	// Merge config with defaults
	const cfg = $derived({ ...DEFAULT_CONFIG, ...config });

	// =============================================================================
	// STATE
	// =============================================================================
	let scrollContainer: HTMLDivElement | null = $state(null);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(true);
	let currentIndex = $state(0);
	let visibleCount = $state(1);
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragScrollLeft = $state(0);
	let buttonsVisible = $state(false);
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	// Computed scroll amount
	const scrollAmount = $derived((cfg.itemWidth + cfg.itemGap) * cfg.scrollItemCount);

	// =============================================================================
	// SCROLL STATE MANAGEMENT
	// =============================================================================
	function updateScrollState() {
		if (!scrollContainer) return;

		const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;

		// Update edge states
		canScrollLeft = scrollLeft > cfg.edgeThreshold;
		canScrollRight = scrollLeft < scrollWidth - clientWidth - cfg.edgeThreshold;

		// Calculate visible count and current index
		const itemTotalWidth = cfg.itemWidth + cfg.itemGap;
		visibleCount = Math.max(1, Math.floor(clientWidth / itemTotalWidth));
		currentIndex = Math.round(scrollLeft / itemTotalWidth);
	}

	function handleScroll() {
		if (scrollTimeout) clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(updateScrollState, cfg.scrollDebounceMs);
	}

	// =============================================================================
	// NAVIGATION
	// =============================================================================
	function scrollBy(amount: number) {
		if (!scrollContainer) return;
		scrollContainer.scrollTo({
			left: scrollContainer.scrollLeft + amount,
			behavior: 'smooth'
		});
	}

	function scrollToIndex(index: number) {
		if (!scrollContainer) return;
		const itemTotalWidth = cfg.itemWidth + cfg.itemGap;
		scrollContainer.scrollTo({
			left: index * itemTotalWidth,
			behavior: 'smooth'
		});
	}

	function handleScrollLeft() {
		scrollBy(-scrollAmount);
	}

	function handleScrollRight() {
		scrollBy(scrollAmount);
	}

	// =============================================================================
	// KEYBOARD NAVIGATION
	// =============================================================================
	function handleKeydown(event: KeyboardEvent) {
		if (!enableKeyboardNav) return;

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				scrollBy(-(cfg.itemWidth + cfg.itemGap));
				break;
			case 'ArrowRight':
				event.preventDefault();
				scrollBy(cfg.itemWidth + cfg.itemGap);
				break;
			case 'Home':
				event.preventDefault();
				scrollContainer?.scrollTo({ left: 0, behavior: 'smooth' });
				break;
			case 'End':
				event.preventDefault();
				scrollContainer?.scrollTo({
					left: scrollContainer.scrollWidth,
					behavior: 'smooth'
				});
				break;
		}
	}

	// =============================================================================
	// DRAG-TO-SCROLL
	// =============================================================================
	function handleMouseDown(event: MouseEvent) {
		if (!enableDragScroll || !scrollContainer) return;
		// Only initiate drag on primary button and not on interactive elements
		if (event.button !== 0) return;
		if ((event.target as HTMLElement).closest('button, a, input, [draggable="true"]')) return;

		isDragging = true;
		dragStartX = event.pageX - scrollContainer.offsetLeft;
		dragScrollLeft = scrollContainer.scrollLeft;
		scrollContainer.style.cursor = 'grabbing';
		scrollContainer.style.userSelect = 'none';
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || !scrollContainer) return;
		event.preventDefault();
		const x = event.pageX - scrollContainer.offsetLeft;
		const walk = (x - dragStartX) * 1.5; // Scroll speed multiplier
		scrollContainer.scrollLeft = dragScrollLeft - walk;
	}

	function handleMouseUp() {
		if (!isDragging || !scrollContainer) return;
		isDragging = false;
		scrollContainer.style.cursor = '';
		scrollContainer.style.userSelect = '';
	}

	function handleMouseLeave() {
		if (isDragging) handleMouseUp();
		buttonsVisible = false;
	}

	// =============================================================================
	// LIFECYCLE
	// =============================================================================
	onMount(() => {
		updateScrollState();

		// Update on resize
		const resizeObserver = new ResizeObserver(() => {
			updateScrollState();
		});

		if (scrollContainer) {
			resizeObserver.observe(scrollContainer);
		}

		return () => {
			resizeObserver.disconnect();
			if (scrollTimeout) clearTimeout(scrollTimeout);
		};
	});

	// Re-check scroll state when totalItems changes
	$effect(() => {
		if (totalItems >= 0) {
			// Small delay to let DOM update
			setTimeout(updateScrollState, 10);
		}
	});
</script>

<div
	class="scroll-container-wrapper"
	role="region"
	aria-label={ariaLabel}
	onmouseenter={() => (buttonsVisible = true)}
	onmouseleave={handleMouseLeave}
>
	<!-- Left fade gradient -->
	{#if showFades && canScrollLeft}
		<div
			class="fade-gradient fade-left"
			style:width="{cfg.fadeWidth}px"
			aria-hidden="true"
		></div>
	{/if}

	<!-- Left navigation button -->
	{#if showButtons && canScrollLeft}
		<button
			type="button"
			class="nav-button nav-button-left"
			class:visible={buttonsVisible}
			onclick={handleScrollLeft}
			aria-label="Scroll left"
			tabindex={-1}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</button>
	{/if}

	<!-- Scrollable content area -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={scrollContainer}
		class="scroll-container"
		class:snap-enabled={enableScrollSnap}
		class:draggable={enableDragScroll && !isDragging}
		style:--item-width="{cfg.itemWidth}px"
		style:--item-gap="{cfg.itemGap}px"
		onscroll={handleScroll}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onkeydown={handleKeydown}
		tabindex={enableKeyboardNav ? 0 : -1}
		role="region"
		aria-live="polite"
	>
		{@render children?.()}
	</div>

	<!-- Right navigation button -->
	{#if showButtons && canScrollRight}
		<button
			type="button"
			class="nav-button nav-button-right"
			class:visible={buttonsVisible}
			onclick={handleScrollRight}
			aria-label="Scroll right"
			tabindex={-1}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
		</button>
	{/if}

	<!-- Right fade gradient -->
	{#if showFades && canScrollRight}
		<div
			class="fade-gradient fade-right"
			style:width="{cfg.fadeWidth}px"
			aria-hidden="true"
		></div>
	{/if}

	<!-- Progress indicator -->
	{#if showProgress && totalItems > visibleCount}
		<div class="progress-wrapper">
			<ScrollProgressIndicator
				total={totalItems}
				visible={visibleCount}
				current={currentIndex}
				variant={progressVariant}
				onNavigate={scrollToIndex}
			/>
		</div>
	{/if}
</div>

<style>
	.scroll-container-wrapper {
		position: relative;
		width: 100%;
	}

	.scroll-container {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: flex-start;
		gap: var(--item-gap);
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
		padding: 4px 0;
		outline: none;
	}

	.scroll-container:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		border-radius: 4px;
	}

	.scroll-container::-webkit-scrollbar {
		height: 6px;
	}

	.scroll-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.scroll-container::-webkit-scrollbar-thumb {
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 3px;
	}

	.scroll-container::-webkit-scrollbar-thumb:hover {
		background-color: rgba(0, 0, 0, 0.3);
	}

	/* Scroll snap */
	.scroll-container.snap-enabled {
		scroll-snap-type: x proximity;
	}

	.scroll-container.snap-enabled > :global(*) {
		scroll-snap-align: start;
	}

	/* Drag cursor */
	.scroll-container.draggable {
		cursor: grab;
	}

	/* Fade gradients */
	.fade-gradient {
		position: absolute;
		top: 0;
		bottom: 0;
		pointer-events: none;
		z-index: 2;
		transition: opacity 0.2s ease;
	}

	.fade-left {
		left: 0;
		background: linear-gradient(to right, rgb(249 250 251) 0%, transparent 100%);
	}

	.fade-right {
		right: 0;
		background: linear-gradient(to left, rgb(249 250 251) 0%, transparent 100%);
	}

	/* Navigation buttons */
	.nav-button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%) scale(0.9);
		z-index: 3;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: white;
		border: 1px solid #e5e7eb;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.2s ease,
			transform 0.2s ease,
			background-color 0.15s ease;
	}

	.nav-button.visible {
		opacity: 1;
		transform: translateY(-50%) scale(1);
	}

	.nav-button:hover {
		background: #f3f4f6;
	}

	.nav-button:active {
		transform: translateY(-50%) scale(0.95);
	}

	.nav-button svg {
		width: 18px;
		height: 18px;
		color: #374151;
	}

	.nav-button-left {
		left: 8px;
	}

	.nav-button-right {
		right: 8px;
	}

	/* Progress indicator wrapper */
	.progress-wrapper {
		display: flex;
		justify-content: center;
		margin-top: 12px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.nav-button,
		.fade-gradient {
			transition: none;
		}

		.scroll-container {
			scroll-behavior: auto;
		}
	}
</style>
