<script lang="ts">
  import type { Snippet } from 'svelte';
  import logo from '$lib/assets/gw-logo-lg.png';

  interface Props {
    onStartDemo: () => void;
    onPasteRoster: () => void;
    onImportFile: () => void;
    demoBusy?: boolean;
    children?: Snippet;
  }

  let { onStartDemo, onPasteRoster, onImportFile, demoBusy = false, children }: Props = $props();
</script>

<section class="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
  <div class="pointer-events-none absolute inset-0">
    <div
      class="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-coral-light opacity-80 blur-3xl"
    ></div>
    <div
      class="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-teal-light opacity-70 blur-3xl"
    ></div>
    <div
      class="absolute top-16 right-24 h-44 w-44 rounded-full bg-amber-light opacity-60 blur-2xl"
    ></div>
  </div>

  <div class="relative grid gap-6 p-6 lg:grid-cols-12 lg:gap-8 lg:p-10">
    <div class="lg:col-span-7">
      <div class="flex items-center gap-4">
        <img
          src={logo}
          alt="Groupwheel logo"
          class="h-18 w-18 animate-[splash-settle_700ms_ease-out] rounded-full bg-white/70 p-1 shadow-sm sm:h-22 sm:w-22"
        />
        <div>
          <p class="text-xs font-semibold tracking-[0.12em] text-teal uppercase">
            Built for real classrooms
          </p>
          <h1 class="mt-2 text-3xl font-semibold text-gray-900 sm:text-4xl">
            Make classroom groups in seconds
          </h1>
        </div>
      </div>

      <p class="mt-5 max-w-2xl text-base leading-7 text-gray-700">
        Privacy-first grouping for teachers. Start with a sample class, a student count, or your
        real roster.
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          class="min-h-[44px] rounded-md bg-coral px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-coral-dark focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:outline-none disabled:opacity-60"
          onclick={onStartDemo}
          disabled={demoBusy}
        >
          {demoBusy ? 'Opening demo...' : 'Open sample class'}
        </button>
        <button
          type="button"
          class="min-h-[44px] rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
          onclick={onPasteRoster}
        >
          Paste roster
        </button>
        <button
          type="button"
          class="min-h-[44px] rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
          onclick={onImportFile}
        >
          Import file
        </button>
      </div>

      <div class="mt-6 flex flex-wrap gap-2 text-xs font-medium text-gray-600">
        <span class="rounded-full border border-gray-200 bg-white/70 px-3 py-1"
          >No account required</span
        >
        <span class="rounded-full border border-gray-200 bg-white/70 px-3 py-1"
          >Saved to this browser</span
        >
        <span class="rounded-full border border-gray-200 bg-white/70 px-3 py-1"
          >Ready to project</span
        >
      </div>

      <p class="mt-4 text-xs text-gray-600">
        Privacy details:
        <a href="/privacy" class="font-medium text-coral underline-offset-2 hover:underline"
          >View privacy policy</a
        >
      </p>
    </div>

    <aside class="lg:col-span-5">
      <div class="rounded-2xl border border-teal/30 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
        <p class="text-xs font-semibold tracking-[0.12em] text-teal uppercase">Quick start</p>
        <h2 class="mt-2 text-lg font-semibold text-gray-900">Start with just two numbers</h2>
        <p class="mt-2 text-sm text-gray-600">
          Enter your class size and target group size. Groupwheel creates a real activity with
          placeholder names.
        </p>
        <div class="mt-4">
          {@render children?.()}
        </div>
      </div>
    </aside>

    <div class="grid gap-3 sm:grid-cols-3 lg:col-span-12">
      <article class="rounded-xl border border-gray-200 bg-white/85 p-4">
        <p class="text-sm font-semibold text-gray-900">Generate fast</p>
        <p class="mt-1 text-sm text-gray-600">Start with numbers, names, or sample data.</p>
      </article>
      <article class="rounded-xl border border-gray-200 bg-white/85 p-4">
        <p class="text-sm font-semibold text-gray-900">Refine by dragging</p>
        <p class="mt-1 text-sm text-gray-600">
          Move students between groups and adjust on the fly.
        </p>
      </article>
      <article class="rounded-xl border border-gray-200 bg-white/85 p-4">
        <p class="text-sm font-semibold text-gray-900">Show to class</p>
        <p class="mt-1 text-sm text-gray-600">Project clean group lists when you are ready.</p>
      </article>
    </div>
  </div>
</section>

<style>
  @keyframes splash-settle {
    0% {
      opacity: 0;
      transform: scale(0.9) rotate(-8deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }
</style>
