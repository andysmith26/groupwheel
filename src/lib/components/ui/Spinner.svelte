<script lang="ts">
	type SpinnerSize = 'sm' | 'md' | 'lg';

	const {
		size = 'md',
		class: className = ''
	}: {
		size?: SpinnerSize;
		class?: string;
	} = $props();

	const sizeClasses: Record<SpinnerSize, string> = {
		sm: 'h-4 w-4 border-2',
		md: 'h-6 w-6 border-2',
		lg: 'h-8 w-8 border-3'
	};

	let computedClass = $derived(
		`inline-block animate-spin rounded-full border-current border-t-transparent ${sizeClasses[size]} ${className}`.trim()
	);
</script>

<span class={computedClass} role="status" aria-label="Loading">
	<span class="sr-only">Loading...</span>
</span>
