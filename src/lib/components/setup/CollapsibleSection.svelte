<script lang="ts">
	/**
	 * CollapsibleSection.svelte
	 *
	 * A reusable expand/collapse section component for the Setup page.
	 * Provides consistent styling and behavior for all configuration sections.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Section title displayed in header */
		title: string;
		/** Summary text shown next to title (e.g., "32 students") */
		summary?: string;
		/** Help text displayed below the header when expanded */
		helpText?: string;
		/** Whether the section is currently expanded */
		isExpanded?: boolean;
		/** Whether this is a primary section (vs secondary/optional) */
		isPrimary?: boolean;
		/** Callback when expand/collapse state changes */
		onToggle?: (isExpanded: boolean) => void;
		/** Section content (Svelte 5 snippet) */
		children?: Snippet;
	}

	let {
		title,
		summary = '',
		helpText = '',
		isExpanded = false,
		isPrimary = true,
		onToggle,
		children
	}: Props = $props();

	function handleToggle() {
		const newState = !isExpanded;
		onToggle?.(newState);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleToggle();
		}
	}
</script>

<section
	class="rounded-lg border bg-white shadow-sm {isPrimary
		? 'border-gray-200'
		: 'border-gray-100'}"
>
	<!-- Header (always visible) -->
	<button
		type="button"
		class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
		onclick={handleToggle}
		onkeydown={handleKeyDown}
		aria-expanded={isExpanded}
	>
		<div class="flex items-center gap-3">
			<!-- Chevron icon with rotation animation -->
			<svg
				class="h-5 w-5 text-gray-400 transition-transform duration-200 {isExpanded
					? 'rotate-90'
					: ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>

			<div>
				<h3
					class="text-base font-medium {isPrimary ? 'text-gray-900' : 'text-gray-700'}"
				>
					{title}
					{#if !isPrimary}
						<span class="ml-1 text-sm font-normal text-gray-500">(Optional)</span>
					{/if}
				</h3>
				{#if summary && !isExpanded}
					<p class="mt-0.5 text-sm text-gray-500">{summary}</p>
				{/if}
			</div>
		</div>

		{#if summary && isExpanded}
			<span class="text-sm text-gray-500">{summary}</span>
		{/if}
	</button>

	<!-- Content (shown when expanded) -->
	{#if isExpanded}
		<div class="border-t border-gray-100 p-4">
			{#if helpText}
				<p class="mb-4 text-sm text-gray-600">{helpText}</p>
			{/if}
			{#if children}
				{@render children()}
			{/if}
		</div>
	{/if}
</section>
