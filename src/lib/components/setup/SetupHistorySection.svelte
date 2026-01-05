<script lang="ts">
	/**
	 * SetupHistorySection.svelte
	 *
	 * History section for the Setup page showing published sessions.
	 * Allows viewing past grouping arrangements in read-only mode.
	 */

	import type { Session, Group, Student } from '$lib/domain';
	import { getStudentDisplayName } from '$lib/domain/student';
	import CollapsibleSection from './CollapsibleSection.svelte';
	import SessionCard from '$lib/components/sessions/SessionCard.svelte';

	interface HistoricalArrangement {
		session: Session;
		groups: Group[];
	}

	interface Props {
		/** List of sessions for this activity */
		sessions: Session[];
		/** Historical arrangements (session with groups) */
		arrangements?: HistoricalArrangement[];
		/** All students for display */
		students: Student[];
		/** Whether the section is expanded */
		isExpanded?: boolean;
		/** Callback when expand/collapse state changes */
		onToggle?: (isExpanded: boolean) => void;
		/** Callback to load a historical arrangement */
		onLoadArrangement?: (sessionId: string) => Promise<HistoricalArrangement | null>;
	}

	let {
		sessions,
		arrangements = [],
		students,
		isExpanded = false,
		onToggle,
		onLoadArrangement
	}: Props = $props();

	// Local state
	let expandedSessionId = $state<string | null>(null);
	let loadingSessionId = $state<string | null>(null);
	let loadedArrangements = $state<Map<string, HistoricalArrangement>>(new Map());

	// Derived state - only show published sessions
	let publishedSessions = $derived(
		sessions
			.filter((s) => s.status === 'PUBLISHED')
			.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
	);

	let sessionCount = $derived(publishedSessions.length);

	let summary = $derived(() => {
		if (sessionCount === 0) return 'No history yet';
		if (sessionCount === 1) return '1 published session';
		return `${sessionCount} published sessions`;
	});

	// Create a map of students by ID for quick lookup
	let studentsById = $derived(() => {
		return new Map(students.map((s) => [s.id, s]));
	});

	async function toggleSession(sessionId: string) {
		if (expandedSessionId === sessionId) {
			expandedSessionId = null;
			return;
		}

		// Load arrangement if not already loaded
		if (!loadedArrangements.has(sessionId) && onLoadArrangement) {
			loadingSessionId = sessionId;
			try {
				const arrangement = await onLoadArrangement(sessionId);
				if (arrangement) {
					loadedArrangements.set(sessionId, arrangement);
					loadedArrangements = loadedArrangements; // Trigger reactivity
				}
			} catch (e) {
				console.error('Failed to load arrangement:', e);
			} finally {
				loadingSessionId = null;
			}
		}

		expandedSessionId = sessionId;
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getStudentName(studentId: string): string {
		const student = studentsById().get(studentId);
		return student ? getStudentDisplayName(student) : studentId;
	}
</script>

<CollapsibleSection
	title="History"
	summary={summary()}
	helpText="View past grouping arrangements from this activity"
	{isExpanded}
	{onToggle}
	isPrimary={false}
>
	{#snippet children()}
		<div class="space-y-4">
			{#if publishedSessions.length === 0}
				<!-- Empty state -->
				<div class="rounded-md border border-gray-200 bg-gray-50 p-6 text-center">
					<svg
						class="mx-auto h-12 w-12 text-gray-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="mt-2 text-sm text-gray-500">No history yet</p>
					<p class="text-xs text-gray-400">
						Groups will appear here after you publish them.
					</p>
				</div>
			{:else}
				<!-- Session list -->
				<div class="space-y-3">
					{#each publishedSessions as session (session.id)}
						<div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
							<!-- Session header (clickable) -->
							<button
								type="button"
								class="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
								onclick={() => toggleSession(session.id)}
							>
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900">{session.name}</p>
									<p class="text-sm text-gray-500">
										{session.academicYear} &middot; Published {formatDate(session.publishedAt ?? session.createdAt)}
									</p>
								</div>
								<svg
									class="ml-4 h-5 w-5 text-gray-400 transition-transform {expandedSessionId === session.id ? 'rotate-180' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>

							<!-- Expanded view -->
							{#if expandedSessionId === session.id}
								<div class="border-t border-gray-100 bg-gray-50 p-4">
									{#if loadingSessionId === session.id}
										<p class="text-center text-sm text-gray-500">Loading arrangement...</p>
									{:else if loadedArrangements.has(session.id)}
										{@const arrangement = loadedArrangements.get(session.id)!}
										<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
											{#each arrangement.groups as group (group.id)}
												<div class="rounded-md border border-gray-200 bg-white p-3">
													<p class="text-sm font-medium text-gray-900">
														{group.name}
														<span class="text-gray-400">({group.memberIds.length})</span>
													</p>
													<ul class="mt-2 space-y-0.5">
														{#each group.memberIds as memberId (memberId)}
															<li class="text-xs text-gray-600 truncate">
																{getStudentName(memberId)}
															</li>
														{/each}
													</ul>
												</div>
											{/each}
										</div>
									{:else}
										<p class="text-center text-sm text-gray-500">
											Unable to load arrangement details.
										</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/snippet}
</CollapsibleSection>
