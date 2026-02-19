<script lang="ts">
	/**
	 * StudentView: Clean projection-optimized view for students to find their groups.
	 *
	 * Two sub-modes:
	 * - "Find My Group" search with large input
	 * - "All Groups" grid showing all group cards
	 */
	import type { ExportableAssignment } from '$lib/utils/csvExport';
	import { getGroupColor } from '$lib/utils/groupColors';

	const {
		groupedAssignments,
		membersByGroup,
		allAssignments,
		projectionMode = false
	}: {
		groupedAssignments: [string, ExportableAssignment[]][];
		membersByGroup: Map<string, string[]>;
		allAssignments: ExportableAssignment[];
		projectionMode?: boolean;
	} = $props();

	// --- Search state ---
	let searchQuery = $state('');
	let debouncedQuery = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let searchInputRef = $state<HTMLInputElement | null>(null);

	// --- View mode ---
	let viewMode = $state<'search' | 'all'>('search');
	let effectiveViewMode = $derived(projectionMode ? 'all' : viewMode);

	// --- Debounce effect ---
	$effect(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debouncedQuery = searchQuery;
		}, 150);
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	// --- Auto-focus search input when search tab is selected ---
	$effect(() => {
		if (viewMode === 'search' && searchInputRef) {
			setTimeout(() => searchInputRef?.focus(), 50);
		}
	});

	// --- Derived ---
	let filteredAssignments = $derived.by(() => {
		if (!debouncedQuery.trim()) return [];
		const query = debouncedQuery.toLowerCase().trim();
		return allAssignments.filter(
			(a) =>
				a.firstName.toLowerCase().startsWith(query) ||
				a.lastName.toLowerCase().startsWith(query)
		);
	});
</script>

<!-- View mode sub-tabs (hidden in projection mode) -->
{#if !projectionMode}
<div class="mb-6 flex gap-2">
	<button
		type="button"
		class="rounded-lg px-6 py-3 text-xl font-semibold transition-colors {viewMode === 'search'
			? 'bg-teal text-white'
			: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		onclick={() => (viewMode = 'search')}
	>
		Find My Group
	</button>
	<button
		type="button"
		class="rounded-lg px-6 py-3 text-xl font-semibold transition-colors {viewMode === 'all'
			? 'bg-teal text-white'
			: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		onclick={() => (viewMode = 'all')}
	>
		All Groups
	</button>
</div>
{/if}

{#if effectiveViewMode === 'search'}
	<!-- Search mode -->
	<div class="space-y-8">
		<div class="mx-auto max-w-2xl">
			<label for="student-search" class="sr-only">Search for your name</label>
			<input
				id="student-search"
				type="text"
				class="block w-full rounded-xl border-2 border-gray-300 px-6 py-5 text-2xl shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-4 focus:ring-teal/30"
				placeholder="Type your name to find your group..."
				bind:value={searchQuery}
				bind:this={searchInputRef}
			/>
		</div>

		{#if searchQuery.trim()}
			{#if filteredAssignments.length === 0}
				<div class="mx-auto max-w-2xl rounded-xl border-2 border-gray-200 bg-white p-8 text-center">
					<p class="text-xl text-gray-600">No student found. Check your spelling?</p>
				</div>
			{:else}
				<div class="mx-auto max-w-2xl space-y-4">
					{#each filteredAssignments as assignment (assignment.studentId)}
						{@const otherMembers = (membersByGroup.get(assignment.groupId) ?? []).filter(
							(name) => name !== assignment.studentName
						)}
						<div class="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-md">
							<div class="flex items-center justify-between gap-4">
								<div>
									<p class="text-2xl font-semibold text-gray-900">{assignment.studentName}</p>
									{#if assignment.grade}
										<p class="mt-1 text-lg text-gray-600">Grade {assignment.grade}</p>
									{/if}
								</div>
								<div class="rounded-xl {getGroupColor(assignment.groupName)} px-6 py-3">
									<p class="text-2xl font-bold text-white">{assignment.groupName}</p>
								</div>
							</div>
							{#if filteredAssignments.length === 1 && otherMembers.length > 0}
								<div class="mt-4 border-t border-gray-100 pt-4">
									<p class="text-base text-gray-500">
										Also in {assignment.groupName}: {otherMembers.join(', ')}
									</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="mx-auto max-w-2xl rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
				<p class="text-xl text-gray-600">Start typing your name above to find your group</p>
			</div>
		{/if}
	</div>
{:else}
	<!-- All groups mode -->
	<div
		class={projectionMode
			? 'projection-grid grid gap-6'
			: 'grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}
	>
		{#each groupedAssignments as [groupName, members] (groupName)}
			<div class="rounded-xl border-2 border-gray-200 bg-white shadow-md">
				<div class="border-b-2 border-gray-100 {getGroupColor(groupName)} px-5 py-4">
					<h3
						class={projectionMode
							? 'text-5xl font-bold text-white'
							: 'text-2xl font-bold text-white'}
					>
						{groupName}
					</h3>
					<p class={projectionMode ? 'mt-2 text-xl text-white/80' : 'mt-1 text-base text-white/80'}>
						{members.length} students
					</p>
				</div>
				<ul class="divide-y divide-gray-100">
					{#each members as member (member.studentId)}
						<li class={projectionMode ? 'px-6 py-4' : 'px-5 py-3'}>
							<p
								class={projectionMode
									? 'text-2xl font-medium text-gray-900'
									: 'text-lg font-medium text-gray-900'}
							>
								{member.studentName}
							</p>
							{#if member.grade}
								<p class={projectionMode ? 'text-lg text-gray-600' : 'text-base text-gray-600'}>Grade {member.grade}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
{/if}

<style>
	.projection-grid {
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	}
</style>
