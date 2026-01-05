<script lang="ts">
	/**
	 * SaveTemplateModal.svelte
	 *
	 * Modal for saving current groups as a reusable template.
	 */

	import { fade, scale } from 'svelte/transition';
	import { Button, Alert } from '$lib/components/ui';
	import type { GroupShell } from '$lib/utils/groupShellValidation';

	interface Props {
		/** Whether the modal is open */
		isOpen: boolean;
		/** Current groups to save */
		groups: GroupShell[];
		/** Callback when modal is closed */
		onClose: () => void;
		/** Callback when template is saved */
		onSave: (name: string, description?: string) => Promise<void>;
	}

	let { isOpen, groups, onClose, onSave }: Props = $props();

	// Local state
	let templateName = $state('');
	let templateDescription = $state('');
	let saving = $state(false);
	let error = $state('');

	// Derived default name
	let defaultName = $derived(() => {
		const count = groups.length;
		return `${count} Groups Template`;
	});

	function resetForm() {
		templateName = '';
		templateDescription = '';
		saving = false;
		error = '';
	}

	async function handleSave() {
		const name = templateName.trim() || defaultName();
		if (!name) {
			error = 'Please enter a template name';
			return;
		}

		saving = true;
		error = '';

		try {
			await onSave(name, templateDescription.trim() || undefined);
			resetForm();
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save template';
		} finally {
			saving = false;
		}
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		} else if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSave();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={handleBackdropClick}
		onkeydown={handleKeyDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="save-template-title"
		tabindex="-1"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<h2 id="save-template-title" class="text-lg font-semibold text-gray-900">
				Save as Template
			</h2>
			<p class="mt-1 text-sm text-gray-600">
				Save your current group configuration for reuse in other activities.
			</p>

			<!-- Groups preview -->
			<div class="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
				<p class="text-xs font-medium text-gray-500 uppercase">Groups to save</p>
				<div class="mt-2 flex flex-wrap gap-1">
					{#each groups as group, i (i)}
						{#if group.name.trim()}
							<span class="rounded bg-white px-2 py-1 text-sm text-gray-700 shadow-sm">
								{group.name}
								{#if group.capacity}
									<span class="text-gray-400">({group.capacity})</span>
								{/if}
							</span>
						{/if}
					{/each}
				</div>
			</div>

			<div class="mt-4 space-y-4">
				<!-- Template name -->
				<div>
					<label for="template-name" class="block text-sm font-medium text-gray-700">
						Template Name
					</label>
					<input
						id="template-name"
						type="text"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
						placeholder={defaultName()}
						bind:value={templateName}
						disabled={saving}
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="template-desc" class="block text-sm font-medium text-gray-700">
						Description (optional)
					</label>
					<input
						id="template-desc"
						type="text"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
						placeholder="e.g., For after-school clubs"
						bind:value={templateDescription}
						disabled={saving}
					/>
				</div>
			</div>

			{#if error}
				<div class="mt-4">
					<Alert variant="error">{error}</Alert>
				</div>
			{/if}

			<div class="mt-6 flex justify-end gap-3">
				<Button variant="ghost" onclick={handleClose} disabled={saving}>
					Cancel
				</Button>
				<Button
					variant="secondary"
					onclick={handleSave}
					disabled={saving || groups.length === 0}
					loading={saving}
				>
					{saving ? 'Saving...' : 'Save Template'}
				</Button>
			</div>
		</div>
	</div>
{/if}
