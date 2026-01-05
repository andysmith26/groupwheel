<script lang="ts">
	import type { Snippet } from 'svelte';

	type AlertVariant = 'error' | 'warning' | 'info' | 'success';

	const {
		variant = 'info',
		title,
		dismissible = false,
		onDismiss,
		children
	}: {
		variant?: AlertVariant;
		title?: string;
		dismissible?: boolean;
		onDismiss?: () => void;
		children?: Snippet;
	} = $props();

	const variantClasses: Record<AlertVariant, string> = {
		error: 'bg-red-50 border-red-200 text-red-700',
		warning: 'bg-amber-50 border-amber-200 text-amber-700',
		info: 'bg-blue-50 border-blue-200 text-blue-700',
		success: 'bg-green-50 border-green-200 text-green-700'
	};

	const iconColors: Record<AlertVariant, string> = {
		error: 'text-red-500',
		warning: 'text-amber-500',
		info: 'text-blue-500',
		success: 'text-green-500'
	};
</script>

<div class="rounded-lg border p-4 {variantClasses[variant]}" role="alert">
	<div class="flex items-start gap-3">
		<!-- Icon -->
		<div class="flex-shrink-0 {iconColors[variant]}">
			{#if variant === 'error'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else if variant === 'warning'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			{:else if variant === 'info'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else if variant === 'success'}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{/if}
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			{#if title}
				<h3 class="text-sm font-medium">{title}</h3>
			{/if}
			{#if children}
				<div class="text-sm {title ? 'mt-1' : ''}">
					{@render children()}
				</div>
			{/if}
		</div>

		<!-- Dismiss button -->
		{#if dismissible}
			<button
				type="button"
				class="flex-shrink-0 -mr-1 -mt-1 p-1 rounded hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
				onclick={onDismiss}
				aria-label="Dismiss"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		{/if}
	</div>
</div>
