<script lang="ts">
	/**
	 * InspectorOverview: Overview tab content for the Inspector.
	 *
	 * Displays:
	 * - Student name (full), ID, gender
	 * - Friends list with inline location badges (Option B format)
	 *
	 * Data flow:
	 * - Receives studentId prop (not full student object) so parent can pass just the ID
	 * - Uses context to resolve student data (avoids prop drilling the full studentsById map)
	 * - Uses utils/friends.ts for data transformation (separation of concerns)
	 */

	import { getAppDataContext } from '$lib/contexts/appData';
	import { getDisplayName, resolveFriendNames, getFriendLocations } from '$lib/utils/friends';
	import { commandStore } from '$lib/stores/commands.svelte';

	interface Props {
		studentId: string;
	}

	let { studentId }: Props = $props();

	const { studentsById, preferencesById } = getAppDataContext();
	const groups = $derived(commandStore.groups);

	// Resolve student from context
	const student = $derived(studentsById[studentId]);
	const preference = $derived(preferencesById[studentId]);
	const friendIds = $derived(preference?.likeStudentIds ?? []);

	// Derive display data
        const displayName = $derived(student ? getDisplayName(student) : 'Unknown');
        const initials = $derived.by(() => {
                if (!student) return '??';
                const firstInitial = student.firstName?.[0];
                const lastInitial = student.lastName?.[0];
                const combined = `${firstInitial ?? ''}${lastInitial ?? ''}`.trim();
                if (combined) return combined.toUpperCase();
                return student.id.slice(0, 2).toUpperCase();
        });
	const friendsWithNames = $derived(resolveFriendNames(friendIds, studentsById));
	const friendLocations = $derived(getFriendLocations(friendIds, groups));

	// Merge names and locations for rendering
	const friendsData = $derived(
		friendsWithNames.map((friend) => {
			const location = friendLocations.find((loc) => loc.friendId === friend.id);
			return {
				id: friend.id,
				name: friend.name,
				groupName: location?.groupName ?? 'Unknown'
			};
		})
	);
</script>

{#if !student}
	<!-- Defensive: If studentId doesn't exist in studentsById -->
	<div class="error-state">
		<p>Student not found: {studentId}</p>
		<p class="hint">This might indicate a data integrity issue.</p>
	</div>
{:else}
	<div class="overview">
		<!-- Student identity section -->
		<section class="section">
			<div class="student-identity">
				<div class="student-initials" aria-hidden="true">
                                        {initials}
				</div>
				<div>
					<h3 class="student-fullname">{displayName}</h3>
					<p class="student-meta">
						ID: {student.id} · {student.gender || 'Not specified'}
					</p>
				</div>
			</div>
		</section>

		<!-- Friends section -->
		<section class="section">
			<h4 class="section-title">
				Friends ({friendIds.length})
			</h4>

			{#if friendsData.length === 0}
				<p class="empty-message">No friends listed</p>
			{:else}
				<ul class="friends-list">
					{#each friendsData as friend (friend.id)}
						<li class="friend-item">
							<span class="friend-name">{friend.name}</span>
							<span class="friend-location">{friend.groupName}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
{/if}

<style>
	.overview {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-title {
		font-size: 14px;
		font-weight: 600;
		color: #374151;
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Student identity */
	.student-identity {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.student-initials {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.student-fullname {
		font-size: 18px;
		font-weight: 600;
		color: #111827;
		margin: 0 0 4px 0;
	}

	.student-meta {
		font-size: 13px;
		color: #6b7280;
		margin: 0;
	}

	/* Friends list */
	.friends-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.friend-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background: #f9fafb;
		border-radius: 6px;
		border: 1px solid #e5e7eb;
	}

	.friend-name {
		font-size: 14px;
		color: #111827;
		font-weight: 500;
	}

	.friend-location {
		font-size: 12px;
		color: #6b7280;
		background: white;
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid #e5e7eb;
	}

	.empty-message {
		color: #9ca3af;
		font-size: 14px;
		font-style: italic;
		margin: 0;
	}

	.error-state {
		background: #fee2e2;
		border: 1px solid #fca5a5;
		border-radius: 6px;
		padding: 16px;
		color: #991b1b;
	}

	.error-state p {
		margin: 0 0 8px 0;
		font-size: 14px;
	}

	.hint {
		font-size: 12px;
		color: #dc2626;
		font-style: italic;
	}
</style>
