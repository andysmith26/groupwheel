<script lang="ts">
	/**
	 * SetupPrefsSection.svelte
	 *
	 * Preferences import section for the Setup page.
	 * Wraps StepPreferences from the wizard with collapsible section styling.
	 */

	import type { ParsedStudent, ParsedPreference } from '$lib/application/useCases/createGroupingActivity';
	import type { SheetConnection } from '$lib/domain/sheetConnection';
	import CollapsibleSection from './CollapsibleSection.svelte';
	import StepPreferences from '$lib/components/wizard/StepPreferences.svelte';

	interface Props {
		/** Students from the roster */
		students: ParsedStudent[];
		/** Group names for validation */
		groupNames: string[];
		/** Current parsed preferences */
		preferences: ParsedPreference[];
		/** Whether the section is expanded */
		isExpanded?: boolean;
		/** Callback when expand/collapse state changes */
		onToggle?: (isExpanded: boolean) => void;
		/** Callback when preferences are parsed */
		onPreferencesChange?: (preferences: ParsedPreference[], warnings: string[]) => void;
		/** Optional connected Google Sheet */
		sheetConnection?: SheetConnection | null;
	}

	let {
		students,
		groupNames,
		preferences,
		isExpanded = false,
		onToggle,
		onPreferencesChange,
		sheetConnection = null
	}: Props = $props();

	// Derived state
	let hasPreferences = $derived(preferences.length > 0);
	let studentCount = $derived(students.length);
	let preferencesCount = $derived(preferences.length);

	let summary = $derived(() => {
		if (!hasPreferences) return 'No preferences imported';
		if (preferencesCount === studentCount) return `All ${studentCount} students`;
		return `${preferencesCount} of ${studentCount} students`;
	});

	function handleClearPreferences() {
		onPreferencesChange?.([], []);
	}

	function handlePreferencesParsed(newPrefs: ParsedPreference[], warnings: string[]) {
		onPreferencesChange?.(newPrefs, warnings);
	}
</script>

<CollapsibleSection
	title="Preferences"
	summary={summary()}
	helpText="Import student group preferences (optional - for preference-based algorithms)"
	{isExpanded}
	{onToggle}
	isPrimary={false}
>
	{#snippet children()}
		<div class="space-y-4">
			{#if hasPreferences}
				<!-- Summary when preferences exist -->
				<div class="rounded-md border border-green-200 bg-green-50 p-3">
					<div class="flex items-center justify-between">
						<p class="text-sm text-green-700">
							<strong>{preferencesCount}</strong> student{preferencesCount === 1 ? ' has' : 's have'} preferences imported
						</p>
						<button
							type="button"
							class="rounded text-sm text-green-700 hover:text-green-900 hover:underline"
							onclick={handleClearPreferences}
						>
							Clear all
						</button>
					</div>
				</div>
			{/if}

			<!-- Wrapped StepPreferences component -->
			<StepPreferences
				{students}
				{groupNames}
				{preferences}
				onPreferencesParsed={handlePreferencesParsed}
				{sheetConnection}
			/>
		</div>
	{/snippet}
</CollapsibleSection>
