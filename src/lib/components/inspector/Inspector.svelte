<script lang="ts">
	import { tick } from 'svelte';
	import InspectorOverview from './InspectorOverview.svelte';
	import { getFriendLocations } from '$lib/utils/friends';
	import { commandStore } from '$lib/stores/commands.svelte';
	import { getAppDataContext } from '$lib/contexts/appData';
	import { getDisplayName } from '$lib/utils/friends';

	interface Props {
		selectedStudentId: string | null;
	}

	let { selectedStudentId }: Props = $props();

	const { studentsById, preferencesById } = getAppDataContext();
	const contentId = 'inspector-drawer-content';

	// Three states: 'closed' | 'minimized' | 'open'
	let drawerState = $state<'closed' | 'minimized' | 'open'>('closed');
	let previousSelectedId: string | null = null;

	let tabButton: HTMLButtonElement | null = null;
	let closeButton: HTMLButtonElement | null = null;
	let titleEl: HTMLHeadingElement | null = null;

	const hasSelection = $derived(Boolean(selectedStudentId));
	const currentStudent = $derived(selectedStudentId ? studentsById[selectedStudentId] : null);
	const currentPreference = $derived(
		selectedStudentId ? preferencesById[selectedStudentId] : undefined
	);
	const currentFriendIds = $derived(currentPreference?.likeStudentIds ?? []);
	const displayName = $derived(currentStudent ? getDisplayName(currentStudent) : '');

	async function openDrawer() {
		if (drawerState === 'open') return;
		drawerState = 'open';
		await tick();
		titleEl?.focus();
	}

	async function minimizeDrawer() {
		if (drawerState !== 'open') return;
		drawerState = 'minimized';
		await tick();
		tabButton?.focus();
	}

	async function closeDrawer() {
		drawerState = 'closed';
		// Note: Don't clear selectedStudentId here - parent manages that
	}

	// When selection changes, open drawer in minimized state
	$effect(() => {
		if (selectedStudentId && selectedStudentId !== previousSelectedId) {
			drawerState = 'minimized';
		} else if (!selectedStudentId) {
			drawerState = 'closed';
		}

		previousSelectedId = selectedStudentId;
	});

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && drawerState !== 'closed') {
			e.preventDefault();
			closeDrawer();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<aside
	class="drawer"
	data-state={drawerState}
	aria-label="Student inspector drawer"
	aria-hidden={drawerState === 'closed'}
>
	{#if drawerState === 'minimized'}
		<div class="drawer-tab-container">
			<button
				type="button"
				class="drawer-tab"
				on:click={openDrawer}
				bind:this={tabButton}
				aria-label="Expand inspector for {displayName}"
			>
				<span class="tab-icon">👤</span>
				<span class="tab-name">{displayName}</span>
				<span class="tab-meta">· {currentStudent?.id} · {currentStudent?.gender || '?'}</span>
				<span class="tab-friends">
					· Friends: {#if currentFriendIds.length === 0}
						None
					{:else}
						{@const friendsWithLocations = getFriendLocations(
							currentFriendIds,
							commandStore.groups
						)}
						{friendsWithLocations
							.slice(0, 4)
							.map((f) => {
								const friend = studentsById[f.friendId];
								const shortName = friend ? friend.firstName : f.friendId;
								const shortGroup =
									f.groupName === 'Unassigned' ? 'U' : f.groupName.replace('Group ', 'G');
								return `${shortName} (${shortGroup})`;
							})
							.join(', ')}
						{#if friendsWithLocations.length > 4}
							, +{friendsWithLocations.length - 4} more
						{/if}
					{/if}
				</span>
			</button>
			<button
				type="button"
				class="tab-expand-btn"
				on:click={openDrawer}
				aria-label="Expand details"
				title="Expand"
			>
				▲
			</button>
			<button
				type="button"
				class="tab-close"
				on:click={closeDrawer}
				aria-label="Close inspector"
				bind:this={closeButton}
			>
				✕
			</button>
		</div>
	{:else if drawerState === 'open'}
		<!-- Full Drawer: Shows complete student info -->
		<div class="drawer-header">
			<h2 class="drawer-title" id="inspector-title" tabindex="-1" bind:this={titleEl}>
				{displayName}
			</h2>

			<div class="drawer-actions">
				<button
					type="button"
					class="drawer-button"
					on:click={minimizeDrawer}
					title="Minimize to tab"
					aria-label="Minimize inspector"
				>
					<span aria-hidden="true">▼</span>
				</button>
				<button
					type="button"
					class="drawer-button"
					on:click={closeDrawer}
					title="Close inspector"
					aria-label="Close inspector"
				>
					<span aria-hidden="true">✕</span>
				</button>
			</div>
		</div>

		<div class="drawer-content" id={contentId} role="region" aria-labelledby="inspector-title">
			{#if hasSelection && selectedStudentId}
				<InspectorOverview studentId={selectedStudentId} />
			{:else}
				<div class="empty-state" role="status">
					<p class="empty-primary">No student selected</p>
					<p class="empty-secondary">Click or drag a student to see their details.</p>
				</div>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.drawer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-top: 1px solid #e5e7eb;
		box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		z-index: 40;
		transition:
			height 0.25s ease,
			box-shadow 0.25s ease;
	}

	.drawer[data-state='closed'] {
		height: 0;
		border-top: none;
		box-shadow: none;
		pointer-events: none;
		overflow: hidden;
	}

	.drawer[data-state='minimized'] {
		height: 36px;
	}

	.drawer[data-state='open'] {
		height: 200px;
	}

	/* Minimized Tab - Full Width Info Strip */
	.drawer-tab-container {
		display: flex;
		width: 100%;
		height: 36px;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.drawer-tab {
		flex: 1;
		height: 36px;
		padding: 0 12px;
		background: transparent;
		border: none;
		display: flex;
		align-items: center;
		gap: 6px;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s ease;
		overflow: hidden;
	}

	.drawer-tab:hover {
		background: #f3f4f6;
	}

	.drawer-tab:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}

	.tab-icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.tab-name {
		font-size: 13px;
		font-weight: 600;
		color: #111827;
		flex-shrink: 0;
	}

	.tab-meta {
		font-size: 12px;
		color: #6b7280;
		flex-shrink: 0;
	}

	.tab-friends {
		font-size: 12px;
		color: #6b7280;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		min-width: 0;
	}

	.tab-expand-btn {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		background: transparent;
		border: none;
		color: #6b7280;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-expand-btn:hover {
		background: #e5e7eb;
		color: #111827;
	}

	.tab-close {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		background: transparent;
		border: none;
		color: #6b7280;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-close:hover {
		background: #e5e7eb;
		color: #111827;
	}

	.tab-expand-btn:focus-visible,
	.tab-close:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}

	/* Full Drawer */
	.drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
		flex-shrink: 0;
	}

	.drawer-title {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.drawer-actions {
		display: flex;
		gap: 4px;
	}

	.drawer-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: 1px solid transparent;
		color: #6b7280;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.drawer-button:hover,
	.drawer-button:focus-visible {
		background: #e5e7eb;
		color: #111827;
		border-color: #d1d5db;
		outline: none;
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		height: 100%;
		color: #374151;
	}

	.empty-primary {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.empty-secondary {
		margin: 0;
		font-size: 14px;
		color: #6b7280;
	}

	/* Responsive: Adjust height for larger screens */
	@media (min-height: 800px) {
		.drawer[data-state='open'] {
			height: 240px;
		}
	}
</style>
