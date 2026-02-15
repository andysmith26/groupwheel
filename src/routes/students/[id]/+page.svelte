<script lang="ts">
	/**
	 * /students/[id]/+page.svelte
	 *
	 * Student profile page showing comprehensive history across all activities:
	 * - Identity information and name variants
	 * - Placement history timeline
	 * - Preference history
	 * - Observations involving this student
	 * - Frequent groupmates
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { StudentProfile } from '$lib/application/useCases/getStudentProfile';
	import { getStudentProfile } from '$lib/services/appEnvUseCases';
	import { isOk } from '$lib/types/result';
	import { extractStudentPreference } from '$lib/domain/preference';
	import CollapsibleSection from '$lib/components/setup/CollapsibleSection.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let profile = $state<StudentProfile | null>(null);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Section expansion states ---
	let historyExpanded = $state(true);
	let groupmatesExpanded = $state(true);
	let preferencesExpanded = $state(true);
	let observationsExpanded = $state(false);

	// --- Derived ---
	let identityId = $derived($page.params.id);

	// --- Load data ---
	onMount(async () => {
		env = getAppEnvContext();
		if (!env) {
			loadError = 'Application environment not available';
			loading = false;
			return;
		}

		if (!identityId) {
			loadError = 'Student ID is required';
			loading = false;
			return;
		}

		const result = await getStudentProfile(env, { identityId });
		if (!isOk(result)) {
			loadError = result.error.type === 'IDENTITY_NOT_FOUND'
				? 'Student not found'
				: 'Failed to load student profile';
			loading = false;
			return;
		}

		profile = result.value;
		loading = false;
	});

	function handleBack() {
		// Go back to previous page or activities list
		if (window.history.length > 1) {
			window.history.back();
		} else {
			goto('/activities');
		}
	}

	function formatDate(date: Date | null | undefined): string {
		if (!date) return 'N/A';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function formatPreferenceRank(rank: number | null): string {
		if (rank === null) return 'No preference';
		if (rank === 1) return '1st choice';
		if (rank === 2) return '2nd choice';
		if (rank === 3) return '3rd choice';
		return `${rank}th choice`;
	}
</script>

<svelte:head>
	<title>{profile?.identity.displayName ?? 'Student'} Profile | Groupwheel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						type="button"
						class="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
						onclick={handleBack}
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						Back
					</button>
					<div>
						<h1 class="text-xl font-semibold text-gray-900">
							{#if loading}
								Loading...
							{:else if profile}
								{profile.identity.displayName}
							{:else}
								Student Profile
							{/if}
						</h1>
						{#if profile}
							<p class="text-sm text-gray-500">
								{profile.identity.gradeLevel ? `Grade ${profile.identity.gradeLevel}` : ''}
								{profile.identity.gradeLevel && profile.summary.activityCount > 0 ? ' · ' : ''}
								{profile.summary.activityCount} {profile.summary.activityCount === 1 ? 'activity' : 'activities'}
								{profile.summary.totalGroupings > 0 ? ` · ${profile.summary.totalGroupings} groupings` : ''}
							</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loadError}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
				<p class="text-red-700">{loadError}</p>
				<button
					type="button"
					class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
					onclick={() => goto('/activities')}
				>
					Return to activities
				</button>
			</div>
		{:else if loading}
			<div class="flex items-center justify-center py-12">
				<div class="flex flex-col items-center gap-2">
					<div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-teal"></div>
					<p class="text-gray-500">Loading student profile...</p>
				</div>
			</div>
		{:else if profile}
			<!-- Summary stats -->
			<div class="mb-6 grid grid-cols-4 gap-4">
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{profile.summary.activityCount}</p>
					<p class="text-sm text-gray-500">Activities</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{profile.summary.totalGroupings}</p>
					<p class="text-sm text-gray-500">Groupings</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-green-600">{profile.summary.firstChoicePercentage}%</p>
					<p class="text-sm text-gray-500">1st Choice Rate</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{profile.pairingStats.length}</p>
					<p class="text-sm text-gray-500">Unique Groupmates</p>
				</div>
			</div>

			<!-- Empty state if no groupings -->
			{#if profile.summary.totalGroupings === 0}
				<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					<h3 class="mt-4 text-lg font-medium text-gray-900">No grouping history yet</h3>
					<p class="mt-2 text-sm text-gray-500">
						This student hasn't been placed in any published sessions yet.
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					<!-- Grouping History -->
					<CollapsibleSection
						title="Grouping History"
						summary="{profile.placementHistory.length} placements"
						isExpanded={historyExpanded}
						onToggle={(expanded) => (historyExpanded = expanded)}
					>
						<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preference</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each profile.placementHistory as item}
										<tr class="hover:bg-gray-50">
											<td class="px-4 py-3 text-sm text-gray-900">
												{formatDate(item.session?.startDate)}
											</td>
											<td class="px-4 py-3 text-sm text-gray-900">
												{item.activityName}
											</td>
											<td class="px-4 py-3 text-sm text-gray-900">
												{item.groupName}
											</td>
											<td class="px-4 py-3 text-sm">
												{#if item.placement.preferenceRank === 1}
													<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
														1st choice
													</span>
												{:else if item.placement.preferenceRank === 2}
													<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
														2nd choice
													</span>
												{:else if item.placement.preferenceRank !== null}
													<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
														{formatPreferenceRank(item.placement.preferenceRank)}
													</span>
												{:else}
													<span class="text-gray-400">—</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</CollapsibleSection>

					<!-- Frequent Groupmates -->
					<CollapsibleSection
						title="Frequent Groupmates"
						summary="{profile.pairingStats.length} students"
						isExpanded={groupmatesExpanded}
						onToggle={(expanded) => (groupmatesExpanded = expanded)}
					>
						{#if profile.pairingStats.length === 0}
							<div class="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
								No groupmates recorded yet.
							</div>
						{:else}
							<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
								<table class="min-w-full divide-y divide-gray-200">
									<thead class="bg-gray-50">
										<tr>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
											<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Times Paired</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200">
										{#each profile.pairingStats.slice(0, 10) as stat}
											<tr class="hover:bg-gray-50">
												<td class="px-4 py-3 text-sm text-gray-900">
													<a
														href="/students/{stat.otherStudentCanonicalId}"
														class="text-teal hover:text-teal-dark hover:underline"
													>
														{stat.otherStudentName}
													</a>
												</td>
												<td class="px-4 py-3 text-sm text-gray-900 text-right">
													{stat.count}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
								{#if profile.pairingStats.length > 10}
									<div class="border-t border-gray-200 px-4 py-3 text-center text-sm text-gray-500">
										Showing top 10 of {profile.pairingStats.length} groupmates
									</div>
								{/if}
							</div>
						{/if}
					</CollapsibleSection>

					<!-- Preferences -->
					{#if profile.preferences.length > 0}
						<CollapsibleSection
							title="Preferences Expressed"
							summary="{profile.preferences.length} preferences"
							isExpanded={preferencesExpanded}
							onToggle={(expanded) => (preferencesExpanded = expanded)}
						>
							<div class="rounded-lg border border-gray-200 bg-white divide-y divide-gray-200">
								{#each profile.preferences as pref}
									{@const studentPref = extractStudentPreference(pref.preference)}
									<div class="px-4 py-3">
										<div class="text-sm font-medium text-gray-900">{pref.activityName}</div>
										<div class="mt-1 flex flex-wrap gap-2">
											{#each studentPref.likeGroupIds as choice, i}
												<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
													{i + 1}. {choice}
												</span>
											{/each}
											{#if studentPref.likeGroupIds.length === 0}
												<span class="text-xs text-gray-400">No preferences</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</CollapsibleSection>
					{/if}

					<!-- Observations -->
					{#if profile.observations.length > 0}
						<CollapsibleSection
							title="Related Observations"
							summary="{profile.observations.length} notes"
							isExpanded={observationsExpanded}
							onToggle={(expanded) => (observationsExpanded = expanded)}
						>
							<div class="space-y-2">
								{#each profile.observations.slice(0, 5) as obs}
									<div class="rounded-lg border border-gray-200 bg-white p-4">
										<div class="flex items-start justify-between">
											<div class="flex items-center gap-2">
												{#if obs.sentiment === 'POSITIVE'}
													<span class="text-green-500">+</span>
												{:else if obs.sentiment === 'NEGATIVE'}
													<span class="text-red-500">−</span>
												{:else}
													<span class="text-gray-400">○</span>
												{/if}
												<span class="text-sm text-gray-500">{formatDate(obs.createdAt)}</span>
											</div>
										</div>
										{#if obs.content}
											<p class="mt-2 text-sm text-gray-700">{obs.content}</p>
										{/if}
										{#if obs.tags && obs.tags.length > 0}
											<div class="mt-2 flex gap-1">
												{#each obs.tags as tag}
													<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
														{tag}
													</span>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
								{#if profile.observations.length > 5}
									<div class="text-center text-sm text-gray-500">
										Showing 5 of {profile.observations.length} observations
									</div>
								{/if}
							</div>
						</CollapsibleSection>
					{/if}

					<!-- Known Names / Variants -->
					{#if profile.identity.knownVariants.length > 1}
						<div class="rounded-lg border border-gray-200 bg-white p-4">
							<h3 class="text-sm font-medium text-gray-900">Known Name Variants</h3>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each profile.identity.knownVariants as variant}
									<span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
										{variant.firstName}{variant.lastName ? ` ${variant.lastName}` : ''}
										<span class="ml-1 text-xs text-gray-400">({variant.source})</span>
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Profile metadata -->
			<div class="mt-8 text-center text-xs text-gray-400">
				First seen: {formatDate(profile.summary.firstSeen)}
				{#if profile.summary.lastSeen}
					· Last activity: {formatDate(profile.summary.lastSeen)}
				{/if}
			</div>
		{/if}
	</main>
</div>
