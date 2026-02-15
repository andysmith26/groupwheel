<script lang="ts">
	/**
	 * StudentDetailSidebar.svelte
	 *
	 * Right-side panel in the workspace showing a student's full profile inline.
	 * Loads data using the getStudentProfile use case and displays:
	 * - Current activity preferences
	 * - Grouping history across activities
	 * - Past observations from their groups
	 * - Frequent groupmates
	 */

	import type { Student } from '$lib/domain';
	import type { StudentPreference } from '$lib/domain/preference';
	import { getCanonicalId } from '$lib/domain/student';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { getStudentProfile } from '$lib/services/appEnvUseCases';
	import { isOk } from '$lib/types/result';
	import type { StudentProfile } from '$lib/application/useCases/getStudentProfile';
	import { extractStudentPreference } from '$lib/domain/preference';
	import CollapsibleSection from '$lib/components/setup/CollapsibleSection.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	interface RecentGroupmate {
		studentName: string;
		count: number;
	}

	const {
		student,
		preferences = null,
		recentGroupmates = [],
		onClose
	} = $props<{
		student: Student;
		preferences?: StudentPreference | null;
		recentGroupmates?: RecentGroupmate[];
		onClose: () => void;
	}>();

	let env = $derived(getAppEnvContext());

	// --- Profile data (loaded async) ---
	let profile = $state<StudentProfile | null>(null);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Section states ---
	let historyExpanded = $state(true);
	let observationsExpanded = $state(true);
	let groupmatesExpanded = $state(false);

	const fullName = $derived(
		`${student.firstName} ${student.lastName ?? ''}`.trim() || student.id
	);

	const canonicalId = $derived(getCanonicalId(student));

	// Load profile when student changes
	$effect(() => {
		loadProfile(canonicalId);
	});

	async function loadProfile(identityId: string) {
		loading = true;
		loadError = null;
		profile = null;

		if (!env) {
			loading = false;
			return;
		}

		const result = await getStudentProfile(env, { identityId });
		if (isOk(result)) {
			profile = result.value;
		} else {
			// Not found is expected for students without a canonical identity
			loadError = result.error.type === 'IDENTITY_NOT_FOUND' ? null : 'Failed to load profile';
		}
		loading = false;
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

<aside
	class="flex h-full w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white"
	aria-label="Student detail panel"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
		<div class="min-w-0">
			<h2 class="truncate text-sm font-semibold text-gray-900">{fullName}</h2>
			{#if student.gradeLevel}
				<p class="text-xs text-gray-500">Grade {student.gradeLevel}</p>
			{/if}
		</div>
		<button
			type="button"
			onclick={onClose}
			class="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
			aria-label="Close panel"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 overflow-y-auto px-4 py-3 space-y-4">
		<!-- Current Preferences -->
		{#if preferences}
			{@const likeGroups = preferences.likeGroupIds ?? []}
			{#if likeGroups.length > 0}
				<div>
					<h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Preferences</h3>
					<div class="flex flex-wrap gap-1.5">
						{#each likeGroups as choice, i}
							<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
								{i + 1}. {choice}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Recent Groupmates (from current activity pairing stats) -->
		{#if recentGroupmates.length > 0}
			<div>
				<h3 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Recent Groupmates</h3>
				<div class="space-y-1">
					{#each recentGroupmates.slice(0, 5) as groupmate}
						<div class="flex items-center justify-between text-xs">
							<span class="truncate text-gray-700">{groupmate.studentName}</span>
							<span class="ml-2 flex-shrink-0 text-gray-400">{groupmate.count}x</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Loading state for profile data -->
		{#if loading}
			<div class="space-y-3 pt-2">
				<Skeleton width="100%" height="1rem" />
				<Skeleton width="80%" height="0.75rem" />
				<Skeleton width="100%" height="3rem" rounded="md" />
				<Skeleton width="100%" height="3rem" rounded="md" />
			</div>
		{:else if loadError}
			<div class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
				{loadError}
			</div>
		{:else if profile}
			<!-- Profile Summary -->
			{#if profile.summary.totalGroupings > 0}
				<div class="grid grid-cols-3 gap-2">
					<div class="rounded-md border border-gray-200 p-2 text-center">
						<p class="text-sm font-semibold text-gray-900">{profile.summary.activityCount}</p>
						<p class="text-[10px] text-gray-500">Activities</p>
					</div>
					<div class="rounded-md border border-gray-200 p-2 text-center">
						<p class="text-sm font-semibold text-gray-900">{profile.summary.totalGroupings}</p>
						<p class="text-[10px] text-gray-500">Groupings</p>
					</div>
					<div class="rounded-md border border-gray-200 p-2 text-center">
						<p class="text-sm font-semibold text-green-600">{profile.summary.firstChoicePercentage}%</p>
						<p class="text-[10px] text-gray-500">1st Choice</p>
					</div>
				</div>
			{/if}

			<!-- Grouping History -->
			{#if profile.placementHistory.length > 0}
				<CollapsibleSection
					title="Grouping History"
					summary="{profile.placementHistory.length} placements"
					isExpanded={historyExpanded}
					onToggle={(expanded) => (historyExpanded = expanded)}
				>
					<div class="space-y-1.5">
						{#each profile.placementHistory.slice(0, 10) as item}
							<div class="rounded border border-gray-100 px-2.5 py-1.5 text-xs">
								<div class="flex items-center justify-between">
									<span class="font-medium text-gray-900">{item.groupName}</span>
									{#if item.placement.preferenceRank === 1}
										<span class="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">1st</span>
									{:else if item.placement.preferenceRank === 2}
										<span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">2nd</span>
									{:else if item.placement.preferenceRank !== null}
										<span class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{formatPreferenceRank(item.placement.preferenceRank)}</span>
									{/if}
								</div>
								<div class="mt-0.5 text-gray-500">
									{item.activityName} · {formatDate(item.session?.startDate)}
								</div>
							</div>
						{/each}
						{#if profile.placementHistory.length > 10}
							<p class="text-center text-[10px] text-gray-400">
								+{profile.placementHistory.length - 10} more
							</p>
						{/if}
					</div>
				</CollapsibleSection>
			{/if}

			<!-- Past Observations -->
			{#if profile.observations.length > 0}
				<CollapsibleSection
					title="Past Observations"
					summary="{profile.observations.length} notes"
					isExpanded={observationsExpanded}
					onToggle={(expanded) => (observationsExpanded = expanded)}
				>
					<div class="space-y-1.5">
						{#each profile.observations.slice(0, 5) as obs}
							<div class="rounded border border-gray-100 px-2.5 py-1.5 text-xs">
								<div class="flex items-center gap-1.5">
									{#if obs.sentiment === 'POSITIVE'}
										<span class="text-green-500">+</span>
									{:else if obs.sentiment === 'NEGATIVE'}
										<span class="text-red-500">-</span>
									{:else}
										<span class="text-gray-400">o</span>
									{/if}
									<span class="text-gray-500">{formatDate(obs.createdAt)}</span>
								</div>
								{#if obs.content}
									<p class="mt-0.5 text-gray-700">{obs.content}</p>
								{/if}
							</div>
						{/each}
						{#if profile.observations.length > 5}
							<p class="text-center text-[10px] text-gray-400">
								+{profile.observations.length - 5} more
							</p>
						{/if}
					</div>
				</CollapsibleSection>
			{/if}

			<!-- Frequent Groupmates (cross-activity) -->
			{#if profile.pairingStats.length > 0}
				<CollapsibleSection
					title="Frequent Groupmates"
					summary="{profile.pairingStats.length} students"
					isExpanded={groupmatesExpanded}
					onToggle={(expanded) => (groupmatesExpanded = expanded)}
				>
					<div class="space-y-1">
						{#each profile.pairingStats.slice(0, 8) as stat}
							<div class="flex items-center justify-between text-xs">
								<span class="truncate text-gray-700">{stat.otherStudentName}</span>
								<span class="ml-2 flex-shrink-0 text-gray-400">{stat.count}x</span>
							</div>
						{/each}
					</div>
				</CollapsibleSection>
			{/if}

			<!-- Empty state -->
			{#if profile.summary.totalGroupings === 0 && profile.observations.length === 0}
				<div class="rounded-md border-2 border-dashed border-gray-200 p-4 text-center">
					<p class="text-xs text-gray-500">No history yet for this student.</p>
				</div>
			{/if}
		{:else}
			<!-- No canonical identity — show limited view -->
			<div class="rounded-md border-2 border-dashed border-gray-200 p-4 text-center">
				<p class="text-xs text-gray-500">No cross-activity history available.</p>
				<p class="mt-1 text-[10px] text-gray-400">History builds as you save sessions.</p>
			</div>
		{/if}

		<!-- Full profile link -->
		<div class="border-t border-gray-100 pt-3">
			<a
				href="/students/{canonicalId}"
				class="flex items-center gap-1 text-xs text-teal hover:text-teal-dark hover:underline"
			>
				View full profile
				<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</a>
		</div>
	</div>
</aside>
