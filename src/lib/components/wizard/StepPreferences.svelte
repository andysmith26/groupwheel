<script lang="ts">
	/**
	 * StepPreferences.svelte
	 *
	 * Step 2 of the Create Groups wizard: paste group requests (optional).
	 *
	 * For Milestone 1 (Turntable pivot), this step is simplified.
	 * Full request-based import with group name validation will be added in Milestone 2.
	 */

	import { devTools } from '$lib/stores/devTools.svelte';
	import type {
		ParsedStudent,
		ParsedPreference
	} from '$lib/application/useCases/createGroupingActivity';

	interface Props {
		/** Students from Step 1 (used to validate preferences) */
		students: ParsedStudent[];

		/** Current parsed preferences */
		preferences: ParsedPreference[];

		/** Callback when preferences are parsed */
		onPreferencesParsed: (preferences: ParsedPreference[], warnings: string[]) => void;
	}

	let { students, preferences, onPreferencesParsed }: Props = $props();

	// For Milestone 1, we skip preference collection
	// The algorithm will use random/balanced assignment
	// Group request collection will be added in Milestone 2

	function skipStep() {
		onPreferencesParsed([], []);
	}

	// Auto-skip on mount for now
	$effect(() => {
		if (preferences.length === 0) {
			skipStep();
		}
	});
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Group Requests (Optional)</h2>
		<p class="mt-1 text-sm text-gray-600">
			If you collected group requests from students, you can import them here.
		</p>
	</div>

	<div class="rounded-lg border border-blue-100 bg-blue-50 p-4">
		<p class="text-sm text-blue-800">
			<strong>Coming soon:</strong> Import student group requests from a Google Form export.
			For now, groups will be generated using balanced random assignment.
		</p>
		<p class="mt-2 text-xs text-blue-600">
			You can still manually adjust groups after generation.
		</p>
	</div>

	{#if devTools.enabled}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
			<p class="text-xs text-gray-500">
				Dev mode: Request import will be implemented in Milestone 2.
				Students: {students.length}, Preferences: {preferences.length}
			</p>
		</div>
	{/if}
</div>
