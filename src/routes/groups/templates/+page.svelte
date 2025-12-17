<script lang="ts">
	/**
	 * /groups/templates/+page.svelte
	 *
	 * Manage reusable group templates (e.g., "Fall Clubs", "Science Fair Teams").
	 * Teachers create templates here, then use them in the grouping wizard.
	 */

	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import {
		listGroupTemplates,
		createGroupTemplate,
		deleteGroupTemplate
	} from '$lib/services/appEnvUseCases';
	import type { GroupTemplate } from '$lib/domain';
	import { isErr } from '$lib/types/result';

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);
	let templates = $state<GroupTemplate[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Create modal state
	let showCreateModal = $state(false);
	let createName = $state('');
	let createDescription = $state('');
	let createGroups = $state<Array<{ name: string; capacity: string }>>([
		{ name: '', capacity: '' }
	]);
	let createError = $state('');
	let creating = $state(false);

	// Delete confirmation
	let deleteTarget = $state<GroupTemplate | null>(null);
	let deleting = $state(false);

	onMount(async () => {
		env = getAppEnvContext();
		await loadTemplates();
	});

	async function loadTemplates() {
		if (!env) return;
		loading = true;
		error = null;

		const result = await listGroupTemplates(env);
		if (isErr(result)) {
			error = 'Failed to load templates';
		} else {
			templates = result.value;
		}

		loading = false;
	}

	function openCreateModal() {
		createName = '';
		createDescription = '';
		createGroups = [{ name: '', capacity: '' }];
		createError = '';
		showCreateModal = true;
	}

	function addGroup() {
		createGroups = [...createGroups, { name: '', capacity: '' }];
	}

	function removeGroup(index: number) {
		if (createGroups.length > 1) {
			createGroups = createGroups.filter((_, i) => i !== index);
		}
	}

	async function handleCreate() {
		if (!env) return;

		// Validate
		const trimmedName = createName.trim();
		if (!trimmedName) {
			createError = 'Please enter a template name';
			return;
		}

		const validGroups = createGroups
			.filter((g) => g.name.trim())
			.map((g) => {
				const capStr = (g.capacity ?? '').toString().trim();
				return {
					name: g.name.trim(),
					capacity: capStr ? parseInt(capStr, 10) : null
				};
			});

		if (validGroups.length === 0) {
			createError = 'Please add at least one group';
			return;
		}

		creating = true;
		createError = '';

		const result = await createGroupTemplate(env, {
			name: trimmedName,
			description: createDescription.trim() || undefined,
			groups: validGroups
		});

		creating = false;

		if (isErr(result)) {
			createError = result.error.message;
			return;
		}

		showCreateModal = false;
		await loadTemplates();
	}

	async function handleDelete() {
		if (!env || !deleteTarget) return;

		deleting = true;
		const result = await deleteGroupTemplate(env, deleteTarget.id);
		deleting = false;

		// Delete never fails (idempotent), so we don't need error handling

		deleteTarget = null;
		await loadTemplates();
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Group Templates | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Group Templates</h1>
			<p class="text-sm text-gray-600">
				Create reusable group sets to share with students for preference collection.
			</p>
		</div>
		<button
			type="button"
			class="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
			onclick={openCreateModal}
		>
			New Template
		</button>
	</header>

	<!-- Back link -->
	<div>
		<a href="/groups" class="text-sm text-teal hover:text-teal-dark hover:underline">
			&larr; Back to Activities
		</a>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading templates...</p>
		</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4">
			<p class="text-sm text-red-700">{error}</p>
		</div>
	{:else if templates.length === 0}
		<!-- Empty state -->
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-light">
				<svg class="h-6 w-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
					></path>
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900">No templates yet</h3>
			<p class="mt-1 text-sm text-gray-500">
				Create a group template to define clubs, teams, or electives that students can choose from.
			</p>
			<button
				type="button"
				class="mt-4 inline-block rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
				onclick={openCreateModal}
			>
				Create Template
			</button>
		</div>
	{:else}
		<!-- Template cards -->
		<div class="space-y-4">
			{#each templates as template (template.id)}
				<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between">
						<div class="min-w-0 flex-1">
							<h3 class="font-medium text-gray-900">{template.name}</h3>
							{#if template.description}
								<p class="mt-1 text-sm text-gray-500">{template.description}</p>
							{/if}
						</div>

						<div class="ml-4 flex items-center gap-2">
							<button
								type="button"
								class="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
								onclick={() => (deleteTarget = template)}
							>
								Delete
							</button>
						</div>
					</div>

					<!-- Groups list -->
					<div class="mt-3 flex flex-wrap gap-2">
						{#each template.groups as group (group.id)}
							<span class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
								{group.name}
								{#if group.capacity}
									<span class="text-gray-400">({group.capacity})</span>
								{/if}
							</span>
						{/each}
					</div>

					<div class="mt-3 text-xs text-gray-400">
						{template.groups.length} group{template.groups.length === 1 ? '' : 's'} &middot; Updated
						{formatDate(template.updatedAt)}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
			<h2 class="text-lg font-semibold text-gray-900">Create Group Template</h2>
			<p class="mt-1 text-sm text-gray-500">
				Define a set of groups that students can choose from.
			</p>

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
						placeholder="e.g., Fall Clubs, Science Fair Teams"
						bind:value={createName}
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
						placeholder="e.g., After-school club signups"
						bind:value={createDescription}
					/>
				</div>

				<!-- Groups -->
				<div>
					<div class="flex items-center justify-between">
						<label class="block text-sm font-medium text-gray-700">Groups</label>
						<button
							type="button"
							class="text-sm text-teal hover:text-teal-dark"
							onclick={addGroup}
						>
							+ Add group
						</button>
					</div>

					<div class="mt-2 space-y-2">
						{#each createGroups as group, i (i)}
							<div class="flex items-center gap-2">
								<input
									type="text"
									class="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
									placeholder="Group name"
									bind:value={group.name}
								/>
								<input
									type="number"
									class="block w-20 rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
									placeholder="Cap"
									min="1"
									bind:value={group.capacity}
								/>
								{#if createGroups.length > 1}
									<button
										type="button"
										class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
										onclick={() => removeGroup(i)}
									>
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						{/each}
					</div>
					<p class="mt-1 text-xs text-gray-500">Capacity is optional. Leave blank for unlimited.</p>
				</div>
			</div>

			{#if createError}
				<div class="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-700">{createError}</p>
				</div>
			{/if}

			<div class="mt-6 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					onclick={() => (showCreateModal = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
					disabled={creating}
					onclick={handleCreate}
				>
					{creating ? 'Creating...' : 'Create Template'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteTarget}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
			<h3 class="text-lg font-medium text-gray-900">Delete Template?</h3>
			<p class="mt-2 text-sm text-gray-600">
				Are you sure you want to delete "{deleteTarget.name}"? This cannot be undone.
			</p>
			<div class="mt-4 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					onclick={() => (deleteTarget = null)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
					disabled={deleting}
					onclick={handleDelete}
				>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
