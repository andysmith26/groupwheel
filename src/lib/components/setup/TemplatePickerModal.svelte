<script lang="ts">
	/**
	 * TemplatePickerModal.svelte
	 *
	 * Modal for selecting a group template to apply to the current activity.
	 */

	import type { GroupTemplate } from '$lib/domain/groupTemplate';
	import type { GroupShell } from '$lib/utils/groupShellValidation';

	interface Props {
		/** Whether the modal is open */
		isOpen: boolean;
		/** Available templates */
		templates: GroupTemplate[];
		/** Callback when modal is closed */
		onClose: () => void;
		/** Callback when a template is selected */
		onSelectTemplate: (groups: GroupShell[]) => void;
		/** Whether templates are loading */
		isLoading?: boolean;
	}

	let {
		isOpen,
		templates,
		onClose,
		onSelectTemplate,
		isLoading = false
	}: Props = $props();

	// Local state
	let selectedTemplate = $state<GroupTemplate | null>(null);
	let showConfirm = $state(false);

	function handleSelect(template: GroupTemplate) {
		selectedTemplate = template;
		showConfirm = true;
	}

	function confirmSelection() {
		if (!selectedTemplate) return;

		// Convert template groups to GroupShell
		const shells: GroupShell[] = selectedTemplate.groups.map((g) => ({
			name: g.name,
			capacity: g.capacity
		}));

		onSelectTemplate(shells);
		resetAndClose();
	}

	function cancelConfirm() {
		showConfirm = false;
		selectedTemplate = null;
	}

	function resetAndClose() {
		selectedTemplate = null;
		showConfirm = false;
		onClose();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			resetAndClose();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (showConfirm) {
				cancelConfirm();
			} else {
				resetAndClose();
			}
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
		aria-labelledby="template-picker-title"
		tabindex="-1"
	>
		<div class="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
			{#if showConfirm && selectedTemplate}
				<!-- Confirmation view -->
				<div class="p-6">
					<h2 id="template-picker-title" class="text-lg font-semibold text-gray-900">
						Use this template?
					</h2>
					<p class="mt-2 text-sm text-gray-600">
						This will replace your current group configuration with "{selectedTemplate.name}".
					</p>

					<!-- Preview groups -->
					<div class="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
						<p class="text-sm font-medium text-gray-900">{selectedTemplate.name}</p>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each selectedTemplate.groups as group (group.id)}
								<span class="rounded-full bg-white px-2 py-1 text-xs text-gray-700 shadow-sm">
									{group.name}
									{#if group.capacity}
										<span class="text-gray-400">({group.capacity})</span>
									{/if}
								</span>
							{/each}
						</div>
					</div>

					<div class="mt-6 flex justify-end gap-3">
						<button
							type="button"
							class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
							onclick={cancelConfirm}
						>
							Back
						</button>
						<button
							type="button"
							class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
							onclick={confirmSelection}
						>
							Use Template
						</button>
					</div>
				</div>
			{:else}
				<!-- Template list view -->
				<div class="p-6">
					<h2 id="template-picker-title" class="text-lg font-semibold text-gray-900">
						Choose a Template
					</h2>
					<p class="mt-1 text-sm text-gray-600">
						Select a saved template to use for your groups.
					</p>
				</div>

				<div class="max-h-80 overflow-y-auto border-t border-b border-gray-200">
					{#if isLoading}
						<div class="flex items-center justify-center py-8">
							<p class="text-sm text-gray-500">Loading templates...</p>
						</div>
					{:else if templates.length === 0}
						<div class="px-6 py-8 text-center">
							<p class="text-sm text-gray-500">No templates saved yet.</p>
							<p class="mt-1 text-xs text-gray-400">
								Create a template from the Groups section by clicking "Save as Template".
							</p>
						</div>
					{:else}
						<div class="divide-y divide-gray-100">
							{#each templates as template (template.id)}
								<button
									type="button"
									class="w-full px-6 py-4 text-left hover:bg-gray-50"
									onclick={() => handleSelect(template)}
								>
									<div class="flex items-start justify-between">
										<div class="min-w-0 flex-1">
											<p class="font-medium text-gray-900">{template.name}</p>
											{#if template.description}
												<p class="mt-0.5 text-sm text-gray-500">{template.description}</p>
											{/if}
											<div class="mt-2 flex flex-wrap gap-1">
												{#each template.groups.slice(0, 5) as group (group.id)}
													<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
														{group.name}
													</span>
												{/each}
												{#if template.groups.length > 5}
													<span class="text-xs text-gray-400">
														+{template.groups.length - 5} more
													</span>
												{/if}
											</div>
										</div>
										<svg
											class="ml-4 h-5 w-5 flex-shrink-0 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="p-4">
					<button
						type="button"
						class="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={resetAndClose}
					>
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
