<script lang="ts">
	const {
		width = '100%',
		height = '1rem',
		rounded = 'md',
		class: className = ''
	}: {
		width?: string;
		height?: string;
		rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
		class?: string;
	} = $props();

	const roundedClasses: Record<string, string> = {
		none: 'rounded-none',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		full: 'rounded-full'
	};
</script>

<div
	class="animate-pulse bg-gray-200 {roundedClasses[rounded]} {className}"
	style="width: {width}; height: {height};"
	aria-hidden="true"
></div>
