<script lang="ts">
	/**
	 * SetupPrefsSection.svelte
	 *
	 * Preferences section for the Setup page.
	 * Provides two modes:
	 * 1. Import - bulk import from CSV/TSV or Google Sheets
	 * 2. Manual Edit - click to edit individual student preferences
	 */

	import type { ParsedStudent, ParsedPreference } from '$lib/application/useCases/createGroupingActivity';
	import type { SheetConnection } from '$lib/domain/sheetConnection';
	import CollapsibleSection from './CollapsibleSection.svelte';
	import StepPreferences from '$lib/components/wizard/StepPreferences.svelte';
	import StudentPreferencesEditor from './StudentPreferencesEditor.svelte';

	type Mode = 'manual' | 'import';

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

	// Local state
	let mode = $state<Mode>('manual');

	// Derived state
	let hasPreferences = $derived(preferences.length > 0);
	let studentCount = $derived(students.length);
	let preferencesCount = $derived(preferences.filter(p => p.likeGroupIds && p.likeGroupIds.length > 0).length);

	let summary = $derived(() => {
		if (!hasPreferences || preferencesCount === 0) return 'No preferences set';
		if (preferencesCount === studentCount) return `All ${studentCount} students`;
		return `${preferencesCount} of ${studentCount} students`;
	});

	function handleClearPreferences() {
		onPreferencesChange?.([], []);
	}

	function handlePreferencesParsed(newPrefs: ParsedPreference[], warnings: string[]) {
		onPreferencesChange?.(newPrefs, warnings);
	}

	function handleManualChange(newPrefs: ParsedPreference[]) {
		onPreferencesChange?.(newPrefs, []);
	}
</script>

<CollapsibleSection
	title="Preferences"
	summary={summary()}
	helpText="Set which groups students prefer to join"
	{isExpanded}
	{onToggle}
	isPrimary={false}
>
	{#snippet children()}
		<div class="space-y-4">
			<!-- Mode toggle -->
			<div class="flex gap-1 rounded-lg bg-gray-100 p-1">
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {mode === 'manual'
						? 'bg-white text-gray-900 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
					onclick={() => (mode = 'manual')}
				>
					Edit Manually
				</button>
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {mode === 'import'
						? 'bg-white text-gray-900 shadow-sm'
						: 'text-gray-600 hover:text-gray-900'}"
					onclick={() => (mode = 'import')}
				>
					Import Data
				</button>
			</div>

			{#if mode === 'manual'}
				<!-- Manual editing mode -->
				{#if groupNames.length === 0}
					<div class="rounded-md border border-amber-200 bg-amber-50 p-3">
						<p class="text-sm text-amber-700">
							Define your groups first before setting preferences.
						</p>
					</div>
				{:else}
					<StudentPreferencesEditor
						{students}
						{groupNames}
						{preferences}
						onPreferencesChange={handleManualChange}
					/>
				{/if}
			{:else}
				<!-- Import mode -->
				{#if hasPreferences && preferencesCount > 0}
					<!-- Summary when preferences exist -->
					<div class="rounded-md border border-green-200 bg-green-50 p-3">
						<div class="flex items-center justify-between">
							<p class="text-sm text-green-700">
								<strong>{preferencesCount}</strong> student{preferencesCount === 1 ? ' has' : 's have'} preferences
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

				<!-- Wrapped StepPreferences component for import -->
				<StepPreferences
					{students}
					{groupNames}
					{preferences}
					onPreferencesParsed={handlePreferencesParsed}
					{sheetConnection}
				/>
			{/if}
		</div>
	{/snippet}
</CollapsibleSection>
