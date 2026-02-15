<script lang="ts">
	/**
	 * TeacherView: iPad-optimized observation grid for live sessions.
	 *
	 * Shows group cards with large sentiment tap targets and note-taking.
	 * When no active session exists, shows a message directing teachers
	 * to start from the workspace.
	 */
	import type { ExportableAssignment } from '$lib/utils/csvExport';
	import type { Observation, Session } from '$lib/domain';
	import type { ObservationSentiment } from '$lib/domain/observation';
	import { getGroupColor } from '$lib/utils/groupColors';
	import ObservationGroupCard from '$lib/components/session/ObservationGroupCard.svelte';

	const {
		groupedAssignments,
		observations,
		activeSession,
		onSentiment,
		onNote
	}: {
		groupedAssignments: [string, ExportableAssignment[]][];
		observations: Observation[];
		activeSession: Session | null;
		onSentiment: (groupId: string, groupName: string, sentiment: ObservationSentiment) => void;
		onNote: (groupId: string, groupName: string, note: string) => void;
	} = $props();

	let observationsByGroupId = $derived.by(() => {
		const map = new Map<string, Observation[]>();
		for (const obs of observations) {
			const existing = map.get(obs.groupId) ?? [];
			existing.push(obs);
			map.set(obs.groupId, existing);
		}
		return map;
	});
</script>

{#if !activeSession}
	<div class="mx-auto max-w-lg py-16 text-center">
		<div class="rounded-xl border-2 border-gray-200 bg-white p-8">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
			</svg>
			<h2 class="mt-4 text-xl font-semibold text-gray-900">No active session</h2>
			<p class="mt-2 text-gray-600">
				Show to Class from the workspace to start recording observations.
			</p>
		</div>
	</div>
{:else}
	<div class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style="touch-action: manipulation">
		{#each groupedAssignments as [groupName, members] (groupName)}
			{@const groupId = members[0]?.groupId ?? groupName}
			{@const groupObs = observationsByGroupId.get(groupId) ?? []}
			<ObservationGroupCard
				{groupId}
				{groupName}
				color={getGroupColor(groupName)}
				studentNames={members.map((m) => m.studentName)}
				observationCount={groupObs.length}
				onSentiment={(sentiment) => onSentiment(groupId, groupName, sentiment)}
				onNote={(note) => onNote(groupId, groupName, note)}
			/>
		{/each}
	</div>
{/if}
