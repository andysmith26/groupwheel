<script lang="ts">
	const {
		open = false,
		title = '',
		message = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		onConfirm,
		onCancel
	} = $props<{
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm?: () => void | Promise<void>;
		onCancel?: () => void | Promise<void>;
	}>();
</script>

{#if open}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
			<p class="mt-2 text-sm text-gray-700">{message}</p>
			<div class="mt-6 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					onclick={onCancel}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					onclick={onConfirm}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
