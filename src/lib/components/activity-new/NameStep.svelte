<script lang="ts">
  import type { ActivityNewWizardStore } from '$lib/stores/activityNewWizard.svelte';

  let {
    wizard,
    onCreate
  }: { wizard: ActivityNewWizardStore; onCreate: () => void } = $props();
</script>

<form
  class="space-y-4"
  onsubmit={(e) => {
    e.preventDefault();
    if (wizard.canContinue) onCreate();
  }}
>
  <h2 class="text-lg font-semibold text-gray-900">Name your activity</h2>
  <div>
    <label class="block text-sm font-medium text-gray-700" for="an-name">Activity name</label>
    <input
      id="an-name"
      type="text"
      class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      placeholder="e.g. Chess Club"
      bind:value={wizard.activityName}
      disabled={wizard.submitting}
    />
  </div>
  <button
    type="submit"
    class="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
    disabled={!wizard.canContinue}
  >
    {wizard.submitting ? 'Creating…' : 'Create Groups'}
  </button>
</form>
