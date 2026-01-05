<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { Button } from '$lib/components/ui';

	const {
		open = false,
		title = '',
		message = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'primary',
		onConfirm,
		onCancel
	} = $props<{
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'primary' | 'danger';
		onConfirm?: () => void | Promise<void>;
		onCancel?: () => void | Promise<void>;
	}>();
</script>

{#if open}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
			<p class="mt-2 text-sm text-gray-700">{message}</p>
			<div class="mt-6 flex justify-end gap-3">
				<Button variant="ghost" onclick={onCancel}>
					{cancelLabel}
				</Button>
				<Button {variant} onclick={onConfirm}>
					{confirmLabel}
				</Button>
			</div>
		</div>
	</div>
{/if}
