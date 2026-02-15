<script lang="ts">
	/**
	 * ContextualHint: A non-blocking, dismissible hint component.
	 *
	 * Used to surface features at the right moment based on user behavior.
	 * Styled as a helpful tip rather than an alert/warning.
	 */
	import type { Snippet } from 'svelte';

	const {
		title,
		icon = 'lightbulb',
		dismissible = true,
		onDismiss,
		actions,
		children
	}: {
		title?: string;
		icon?: 'lightbulb' | 'sparkles' | 'info' | 'chart';
		dismissible?: boolean;
		onDismiss?: () => void;
		actions?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<div
	class="rounded-lg border border-teal-200 bg-teal-50/50 p-4"
	role="status"
	aria-live="polite"
>
	<div class="flex items-start gap-3">
		<!-- Icon -->
		<div class="flex-shrink-0 text-teal-600">
			{#if icon === 'lightbulb'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					/>
				</svg>
			{:else if icon === 'sparkles'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
					/>
				</svg>
			{:else if icon === 'info'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			{:else if icon === 'chart'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
			{/if}
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			{#if title}
				<h3 class="text-sm font-medium text-teal-800">{title}</h3>
			{/if}
			{#if children}
				<div class="text-sm text-teal-700 {title ? 'mt-1' : ''}">
					{@render children()}
				</div>
			{/if}
			{#if actions}
				<div class="mt-3 flex items-center gap-3">
					{@render actions()}
				</div>
			{/if}
		</div>

		<!-- Dismiss button -->
		{#if dismissible && onDismiss}
			<button
				type="button"
				class="flex-shrink-0 -mr-1 -mt-1 p-1 rounded text-teal-500 hover:text-teal-700 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
				onclick={onDismiss}
				aria-label="Dismiss"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>
