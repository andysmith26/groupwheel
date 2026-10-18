<script lang="ts">
  import type {
    ActivityNewWizardStore,
    InitialPopulation
  } from '$lib/stores/activityNewWizard.svelte';

  let { wizard }: { wizard: ActivityNewWizardStore } = $props();

  let options = $derived<
    { value: InitialPopulation; label: string; hint: string; disabled: boolean }[]
  >([
    {
      value: 'top-choice',
      label: '1st choice',
      hint: wizard.canUseTopChoice
        ? 'Place each student in the group they ranked first'
        : 'Add group choices on the Choices step to use this',
      disabled: !wizard.canUseTopChoice
    },
    {
      value: 'random',
      label: 'Random',
      hint: 'Deal students into groups at random',
      disabled: false
    },
    { value: 'empty', label: 'Empty', hint: 'Start with no one placed', disabled: false }
  ]);
</script>

<div class="space-y-6">
  <h2 class="text-lg font-semibold text-gray-900">Activity setup</h2>

  <div>
    <label class="block text-sm font-medium text-gray-700" for="an-name">Activity name</label>
    <input
      id="an-name"
      type="text"
      class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      placeholder="e.g. Chess Club"
      bind:value={wizard.activityName}
    />
  </div>

  <fieldset>
    <legend class="text-sm font-medium text-gray-700">Starting arrangement</legend>
    <div class="mt-2 grid gap-3 sm:grid-cols-3">
      {#each options as option (option.value)}
        <label
          class="flex items-start gap-2.5 rounded-md border px-3.5 py-3 {option.disabled
            ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
            : 'cursor-pointer border-gray-200 hover:bg-gray-50'}"
        >
          <input
            type="radio"
            name="initial-population"
            class="mt-0.5 accent-teal-600"
            value={option.value}
            disabled={option.disabled}
            checked={wizard.initialPopulation === option.value}
            onchange={() => (wizard.populationChoice = option.value)}
          />
          <span>
            <span class="block text-sm font-medium">{option.label}</span>
            <span class="block text-xs">{option.hint}</span>
          </span>
        </label>
      {/each}
    </div>
  </fieldset>
</div>
