<script lang="ts">
  export type HomeOnboardingVariant = 'demo-started' | 'quickstart-started' | 'roster-started';

  interface Props {
    variant: HomeOnboardingVariant;
    onQuickStart: () => void;
    onPasteRoster: () => void;
    onImportFile: () => void;
    onDismiss: () => void;
  }

  let { variant, onQuickStart, onPasteRoster, onImportFile, onDismiss }: Props = $props();

  const copyByVariant: Record<HomeOnboardingVariant, { title: string; body: string }> = {
    'demo-started': {
      title: "You've seen the flow.",
      body: 'Ready to make your own activity?'
    },
    'quickstart-started': {
      title: 'Your groups are ready.',
      body: 'Add real names anytime.'
    },
    'roster-started': {
      title: 'Roster imported.',
      body: "You're ready to make groups."
    }
  };

  let copy = $derived(copyByVariant[variant]);
</script>

<div
  class="rounded-2xl border border-teal/25 bg-linear-to-r from-teal-light/80 via-white to-amber-light/50 p-4 shadow-sm"
>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="text-sm font-semibold text-gray-900">{copy.title}</p>
      <p class="text-sm text-gray-600">{copy.body}</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-md bg-coral px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-coral-dark focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:outline-none"
        onclick={onQuickStart}
      >
        Quick start
      </button>
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
        onclick={onPasteRoster}
      >
        Paste roster
      </button>
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
        onclick={onImportFile}
      >
        Import file
      </button>
      <button
        type="button"
        class="rounded-md px-2 py-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
        aria-label="Dismiss onboarding banner"
        onclick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  </div>
</div>
