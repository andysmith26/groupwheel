<script lang="ts">
	/**
	 * StepReviewGenerate.svelte
	 *
	 * Step 3 of the 3-step wizard: Review & Create Groups.
	 * Shows prominent name field, summary of setup, and "Create Groups" action.
	 * Preferences are NOT shown here - they're added later from Setup page.
	 */

	import { Button } from '$lib/components/ui';
	import type { ParsedStudent } from '$lib/application/useCases/createGroupingActivity';
	import type { GroupShellConfig } from './StepGroups.svelte';

	interface Props {
		/** Activity name (bound to parent) */
		activityName: string;

		/** Callback when name changes */
		onNameChange: (name: string) => void;

		/** Students from Step 1 */
		students: ParsedStudent[];

		/** Group shells + constraints from Step 2 */
		groupConfig: GroupShellConfig;

		/** Whether we're reusing an existing roster */
		isReusingRoster: boolean;

		/** Name of reused roster (if applicable) */
		reusedRosterName?: string;

		/** Whether submission is in progress */
		isSubmitting: boolean;

		/** Callback to submit and generate groups */
		onSubmit: () => void;
	}

	let {
		activityName,
		onNameChange,
		students,
		groupConfig,
		isReusingRoster,
		reusedRosterName,
		isSubmitting,
		onSubmit
	}: Props = $props();

	// Auto-generate name suggestion based on groups
	let suggestedName = $derived.by(() => {
		if (groupConfig.groups.length > 0) {
			const firstName = groupConfig.groups[0].name;
			if (firstName) {
				// If first group name contains "Club" or "Team", use it directly
				if (firstName.toLowerCase().includes('club') || firstName.toLowerCase().includes('team')) {
					return `${firstName} Groups`;
				}
				// Otherwise add "Groups" suffix
				return `${firstName} Groups`;
			}
		}
		// Fallback based on student count
		return `Activity - ${new Date().toLocaleDateString()}`;
	});

	// Set default name if empty on mount
	$effect(() => {
		if (!activityName && suggestedName) {
			onNameChange(suggestedName);
		}
	});

	// Stats for summary
	let stats = $derived({
		studentCount: students.length,
		groupCount:
			groupConfig.groups.length > 0
				? groupConfig.groups.length
				: (groupConfig.targetGroupCount ?? Math.max(1, Math.round(students.length / 5))),
		hasNamedGroups: groupConfig.groups.length > 0
	});

	let sizeSummary = $derived(
		[
			groupConfig.minSize && `min ${groupConfig.minSize}`,
			groupConfig.maxSize && `max ${groupConfig.maxSize}`
		]
			.filter(Boolean)
			.join(' · ')
	);

	let groupNamesList = $derived.by(() => {
		if (groupConfig.groups.length === 0) return '';
		const names = groupConfig.groups.map((g) => g.name).filter((n) => n.trim().length > 0);
		if (names.length <= 3) {
			return names.join(', ');
		}
		return `${names.slice(0, 3).join(', ')}... +${names.length - 3} more`;
	});

	let canSubmit = $derived(activityName.trim().length > 0 && !isSubmitting);

	// Editing state for inline name editing
	let isEditingName = $state(false);
	let nameInputRef = $state<HTMLInputElement | null>(null);

	function startEditingName() {
		isEditingName = true;
		// Focus input after it renders
		setTimeout(() => {
			nameInputRef?.focus();
			nameInputRef?.select();
		}, 0);
	}

	function stopEditingName() {
		isEditingName = false;
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			stopEditingName();
		} else if (e.key === 'Escape') {
			stopEditingName();
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Step 3 of 3: Review & Create</h2>
		<p class="mt-1 text-sm text-gray-600">
			Review your setup and create your groups.
		</p>
	</div>

	<!-- Prominent Activity Name Section -->
	<div class="rounded-lg border-2 border-gray-200 bg-white p-4">
		<label class="block text-sm font-medium text-gray-700 mb-2" for="activity-name" id="activity-name-label">
			Activity Name
		</label>

		{#if isEditingName}
			<input
				bind:this={nameInputRef}
				id="activity-name"
				type="text"
				class="w-full rounded-lg border border-teal px-4 py-3 text-xl font-medium focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
				value={activityName}
				oninput={(e) => onNameChange(e.currentTarget.value)}
				onblur={stopEditingName}
				onkeydown={handleNameKeydown}
				placeholder="Enter activity name..."
			/>
		{:else}
			<button
				type="button"
				aria-labelledby="activity-name-label"
				class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-xl font-medium text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between group"
				onclick={startEditingName}
			>
				<span class={activityName ? '' : 'text-gray-400'}>
					{activityName || 'Click to add name...'}
				</span>
				<svg
					class="h-5 w-5 text-gray-400 group-hover:text-gray-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
					/>
				</svg>
			</button>
		{/if}

		{#if !activityName.trim()}
			<p class="mt-2 text-sm text-red-600">Activity name is required</p>
		{/if}
	</div>

	<!-- Summary Section -->
	<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
		<h3 class="text-sm font-medium text-gray-700 mb-3">Summary</h3>

		<div class="space-y-3">
			<!-- Students -->
			<div class="flex items-start gap-3">
				<span class="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 flex-shrink-0">
					<svg class="h-3.5 w-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
						></path>
					</svg>
				</span>
				<div>
					<div class="font-medium text-gray-900">
						{stats.studentCount} students
					</div>
					<div class="text-sm text-gray-500">
						{#if isReusingRoster && reusedRosterName}
							From "{reusedRosterName}" roster
						{:else}
							From pasted roster
						{/if}
					</div>
				</div>
			</div>

			<!-- Groups -->
			<div class="flex items-start gap-3">
				<span class="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
					<svg class="h-3.5 w-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						></path>
					</svg>
				</span>
				<div>
					<div class="font-medium text-gray-900">
						{stats.groupCount} {stats.hasNamedGroups ? 'named groups' : 'groups'}
					</div>
					<div class="text-sm text-gray-500">
						{#if stats.hasNamedGroups && groupNamesList}
							{groupNamesList}
						{:else}
							{sizeSummary ? `${sizeSummary}, ` : ''}Auto-balanced distribution
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Info about preferences -->
		<div class="mt-4 pt-3 border-t border-gray-200">
			<p class="text-xs text-gray-500">
				Groups will be assigned randomly. After creating, you can import student preferences from Setup for smarter placement.
			</p>
		</div>
	</div>

	<!-- Create Groups Button -->
	<div class="pt-2">
		<Button
			variant="primary"
			size="lg"
			class="w-full"
			disabled={!canSubmit}
			loading={isSubmitting}
			onclick={onSubmit}
		>
			{#if !isSubmitting}
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			{/if}
			{isSubmitting ? 'Creating groups...' : 'Create Groups'}
		</Button>
	</div>
</div>
