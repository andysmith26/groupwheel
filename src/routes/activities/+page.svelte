<script lang="ts">
	/**
	 * /activities/+page.svelte
	 *
	 * Activity Dashboard - Shows all grouping activities with status and actions.
	 * Part of the UX Overhaul (Approach C).
	 */

	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import {
		listActivities,
		renameActivity,
		deleteActivity,
		onAuthStateChange,
		isAuthenticated,
		type ActivityDisplay
	} from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import { Button, Alert } from '$lib/components/ui';
	import ActivityCardSkeleton from '$lib/components/ui/ActivityCardSkeleton.svelte';
	import type { Program } from '$lib/domain';

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);
	let authUnsubscribe: (() => void) | null = null;
	let isLoggedIn = $state(false);
	let newActivityHref = $derived(isLoggedIn ? '/track-responses' : '/activities/import');

	let activities = $state<ActivityDisplay[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Menu and modal state
	let openMenuId = $state<string | null>(null);
	let renameModalOpen = $state(false);
	let renameTarget = $state<ActivityDisplay | null>(null);
	let renameValue = $state('');
	let renameError = $state<string | null>(null);
	let deleteModalOpen = $state(false);
	let deleteTarget = $state<ActivityDisplay | null>(null);
	let isDeleting = $state(false);
	let now = $state(new Date());

	onMount(async () => {
		env = getAppEnvContext();
		if (env) {
			isLoggedIn = isAuthenticated(env);
			authUnsubscribe = onAuthStateChange(env, (user) => {
				isLoggedIn = Boolean(user);
			});
		}
		await loadActivities();

		// Close menu on outside click
		const handleClick = (e: MouseEvent) => {
			if (openMenuId && !(e.target as Element).closest('.overflow-menu')) {
				openMenuId = null;
			}
		};
		const intervalId = window.setInterval(() => {
			now = new Date();
		}, 60_000);

		document.addEventListener('click', handleClick);
		return () => {
			document.removeEventListener('click', handleClick);
			window.clearInterval(intervalId);
			authUnsubscribe?.();
		};
	});

	async function loadActivities() {
		if (!env) return;

		loading = true;
		error = null;

		const result = await listActivities(env);

		if (isErr(result)) {
			error = result.error.message;
		} else {
			activities = result.value;
		}

		loading = false;
	}

	function formatRelativeDate(date: Date, reference: Date): string {
		const diffMs = date.getTime() - reference.getTime();
		const diffMinutes = Math.round(Math.abs(diffMs) / 60_000);
		const isFuture = diffMs > 0;

		if (diffMinutes < 1) return 'just now';
		if (diffMinutes < 60) {
			const label = `${diffMinutes}m`;
			return isFuture ? `in ${label}` : `${label} ago`;
		}
		const diffHours = Math.round(diffMinutes / 60);
		if (diffHours < 24) {
			const label = `${diffHours}h`;
			return isFuture ? `in ${label}` : `${label} ago`;
		}
		const diffDays = Math.round(diffHours / 24);
		const label = `${diffDays}d`;
		return isFuture ? `in ${label}` : `${label} ago`;
	}

	function parseDateLabel(label: string): Date | null {
		const trimmed = label.trim();
		const looksNumericDate =
			/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed);
		if (!looksNumericDate) return null;
		const parsed = new Date(trimmed);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	function getProgramTimeLabel(program: Program): string {
		if ('termLabel' in program.timeSpan) {
			const parsed = parseDateLabel(program.timeSpan.termLabel);
			return parsed ? formatRelativeDate(parsed, now) : program.timeSpan.termLabel;
		}
		if ('start' in program.timeSpan && program.timeSpan.start) {
			return formatRelativeDate(program.timeSpan.start, now);
		}
		return '';
	}

	function getStatusInfo(activity: ActivityDisplay): {
		label: string;
		style: string;
		icon: string;
	} | null {
		if (activity.hasScenario) {
			return null;
		}
		return {
			label: 'Draft',
			style: 'bg-gray-100 text-gray-600',
			icon: '○'
		};
	}

	function getPrimaryAction(activity: ActivityDisplay): { label: string; href: string } {
		if (activity.hasScenario) {
			return {
				label: 'Edit Groups',
				href: `/activities/${activity.program.id}/workspace`
			};
		}
		return {
			label: 'Continue Setup',
			href: `/activities/${activity.program.id}`
		};
	}

	function getStudentCountLabel(count: number): string {
		if (count === 0) return 'No students yet';
		if (count === 1) return '1 student';
		return `${count} students`;
	}

	// Menu handlers
	function toggleMenu(id: string, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		openMenuId = openMenuId === id ? null : id;
	}

	function handleMenuAction(action: string, activity: ActivityDisplay) {
		openMenuId = null;

		switch (action) {
			case 'rename':
				renameTarget = activity;
				renameValue = activity.program.name;
				renameError = null;
				renameModalOpen = true;
				break;
			case 'delete':
				deleteTarget = activity;
				deleteModalOpen = true;
				break;
		}
	}

	async function handleRenameSubmit() {
		if (!env || !renameTarget) return;

		const trimmed = renameValue.trim();
		if (!trimmed) {
			renameError = 'Activity name cannot be empty';
			return;
		}

		const result = await renameActivity(env, {
			programId: renameTarget.program.id,
			newName: trimmed
		});

		if (isErr(result)) {
			renameError = result.error.message;
			return;
		}

		// Update local state
		activities = activities.map((a) =>
			a.program.id === renameTarget!.program.id
				? { ...a, program: { ...a.program, name: trimmed } }
				: a
		);

		renameModalOpen = false;
		renameTarget = null;
	}

	async function handleDeleteConfirm() {
		if (!env || !deleteTarget) return;

		isDeleting = true;
		const result = await deleteActivity(env, { programId: deleteTarget.program.id });

		if (isErr(result)) {
			// Show error in the modal
			isDeleting = false;
			return;
		}

		// Remove from local state
		activities = activities.filter((a) => a.program.id !== deleteTarget!.program.id);
		isDeleting = false;
		deleteModalOpen = false;
		deleteTarget = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (renameModalOpen) {
				renameModalOpen = false;
				renameTarget = null;
			}
			if (deleteModalOpen) {
				deleteModalOpen = false;
				deleteTarget = null;
			}
			if (openMenuId) {
				openMenuId = null;
			}
		}
	}
</script>

<svelte:head>
	<title>Activities | Groupwheel</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Your Activities</h1>
			<p class="text-sm text-gray-600">
				Create and manage student groupings for projects, labs, and activities.
			</p>
		</div>
		<div class="flex items-center gap-3">
			<Button href="/activities/import" variant="secondary">
				Import
			</Button>
			<Button href={newActivityHref} variant="primary">
				+ New Activity
			</Button>
		</div>
	</header>

	<div class="rounded-lg border-2 border-amber-200 bg-amber-50 p-6 text-amber-900">
		<h2 class="text-base font-semibold">Heads up: activities stay on this device</h2>
		<p class="mt-2 text-sm text-amber-900/90">
			Activities are saved only in this browser. Other people cannot see them.
			To share or permanently save an activity, use the Export option on the editing page.
		</p>
	</div>

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _}
				<ActivityCardSkeleton />
			{/each}
		</div>
	{:else if error}
		<Alert variant="error">{error}</Alert>
	{:else if activities.length === 0}
		<!-- Empty state -->
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-light"
			>
				<svg class="h-6 w-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					></path>
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900">No activities yet</h3>
			<p class="mt-1 text-sm text-gray-500">Create your first grouping activity to get started.</p>
			<div class="mt-4 flex items-center justify-center gap-3">
				<Button href={newActivityHref} variant="primary">
					+ New Activity
				</Button>
			</div>
			<p class="mt-4 text-sm text-gray-500">
				or <a href="/activities/import" class="text-teal hover:text-teal-dark underline">import from a file</a>
			</p>
		</div>
	{:else}
		<!-- Activity cards -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each activities as activity (activity.program.id)}
				{@const status = getStatusInfo(activity)}
				{@const action = getPrimaryAction(activity)}
				<div
					class="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
				>
					<a href="/activities/{activity.program.id}" class="block">
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<h3 class="truncate font-medium text-gray-900 group-hover:text-teal">
									{activity.program.name}
								</h3>
								<p class="mt-1 text-sm text-gray-500">
									{getStudentCountLabel(activity.studentCount)}
								</p>
							</div>

							<!-- Status badge -->
							{#if status}
								<span
									class="ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {status.style}"
								>
									{status.icon} {status.label}
								</span>
							{/if}
						</div>

						<div class="mt-3 flex items-center justify-between text-xs text-gray-400">
							<span>{getProgramTimeLabel(activity.program)}</span>
						</div>
					</a>

					<div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
						<Button href={action.href} variant="secondary" size="sm">
							{action.label}
						</Button>

						<!-- Overflow menu -->
						<div class="overflow-menu relative">
							<button
								type="button"
								class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
								aria-label="More options"
								onclick={(e) => toggleMenu(activity.program.id, e)}
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
									/>
								</svg>
							</button>

							{#if openMenuId === activity.program.id}
								<div
									class="absolute right-0 z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
								>
									<button
										type="button"
										class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
										onclick={() => handleMenuAction('rename', activity)}
									>
										Rename
									</button>
									<hr class="my-1 border-gray-100" />
									<button
										type="button"
										class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
										onclick={() => handleMenuAction('delete', activity)}
									>
										Delete
									</button>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Rename Modal -->
{#if renameModalOpen && renameTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<h3 class="text-lg font-medium text-gray-900">Rename Activity</h3>
			<div class="mt-4">
				<input
					type="text"
					class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
					bind:value={renameValue}
					onkeydown={(e) => e.key === 'Enter' && handleRenameSubmit()}
				/>
				{#if renameError}
					<p class="mt-2 text-sm text-red-600">{renameError}</p>
				{/if}
			</div>
			<div class="mt-4 flex justify-end gap-3">
				<Button
					variant="ghost"
					onclick={() => {
						renameModalOpen = false;
						renameTarget = null;
					}}
				>
					Cancel
				</Button>
				<Button variant="secondary" onclick={handleRenameSubmit}>
					Save
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteModalOpen && deleteTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<h3 class="text-lg font-medium text-gray-900">Delete Activity</h3>
			<p class="mt-2 text-sm text-gray-600">
				Delete "{deleteTarget.program.name}"? This cannot be undone.
			</p>
			<div class="mt-4 flex justify-end gap-3">
				<Button
					variant="ghost"
					onclick={() => {
						deleteModalOpen = false;
						deleteTarget = null;
					}}
					disabled={isDeleting}
				>
					Cancel
				</Button>
				<Button
					variant="danger"
					onclick={handleDeleteConfirm}
					disabled={isDeleting}
					loading={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</Button>
			</div>
		</div>
	</div>
{/if}
