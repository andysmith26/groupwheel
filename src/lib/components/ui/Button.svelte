<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	const {
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		type = 'button',
		href,
		class: className = '',
		onclick,
		children
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		loading?: boolean;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const baseClasses =
		'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses: Record<ButtonVariant, string> = {
		primary: 'bg-coral text-white hover:bg-coral-dark focus:ring-coral',
		secondary: 'bg-teal text-white hover:bg-teal-dark focus:ring-teal',
		danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300 focus:ring-gray-400'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	let computedClass = $derived(
		`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()
	);

	let isDisabled = $derived(disabled || loading);
</script>

{#if href && !isDisabled}
	<a {href} class={computedClass} onclick={onclick}>
		{#if loading}
			<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
		{/if}
		{@render children()}
	</a>
{:else}
	<button {type} class={computedClass} disabled={isDisabled} onclick={onclick}>
		{#if loading}
			<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
		{/if}
		{@render children()}
	</button>
{/if}
