<script lang="ts">
  import type { ActivityDisplay } from '$lib/services/appEnvUseCases';
  import type { Program } from '$lib/domain';

  interface Props {
    activity: ActivityDisplay;
    now: Date;
    onRename: (activity: ActivityDisplay) => void;
    onDelete: (activity: ActivityDisplay) => void;
    openMenuId: string | null;
    onToggleMenu: (id: string, e: MouseEvent) => void;
  }

  let { activity, now, onRename, onDelete, openMenuId, onToggleMenu }: Props = $props();

  function formatRelativeDate(date: Date, reference: Date): string {
    const diffMs = date.getTime() - reference.getTime();
    const diffMinutes = Math.round(Math.abs(diffMs) / 60_000);
    const isFuture = diffMs > 0;

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) {
      const label = `${diffMinutes}m`;
      return isFuture ? `in ${label}` : `${label} ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      const label = `${diffHours}h`;
      return isFuture ? `in ${label}` : `${label} ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    const label = `${diffDays}d`;
    return isFuture ? `in ${label}` : `${label} ago`;
  }

  function parseDateLabel(label: string): Date | null {
    const trimmed = label.trim();
    const looksNumericDate =
      /^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed);
    if (!looksNumericDate) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function getProgramTimeLabel(program: Program): string {
    if ('termLabel' in program.timeSpan) {
      const parsed = parseDateLabel(program.timeSpan.termLabel);
      return parsed ? formatRelativeDate(parsed, now) : program.timeSpan.termLabel;
    }
    if ('start' in program.timeSpan && program.timeSpan.start) {
      return formatRelativeDate(program.timeSpan.start, now);
    }
    return '';
  }

  function getStudentCountLabel(count: number): string {
    if (count === 0) return 'No students yet';
    if (count === 1) return '1 student';
    return `${count} students`;
  }

  let timeLabel = $derived(getProgramTimeLabel(activity.program));
  let studentLabel = $derived(getStudentCountLabel(activity.studentCount));
  let isMenuOpen = $derived(openMenuId === activity.program.id);
</script>

<div
  class="group relative flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2 hover:border-teal/30 hover:shadow-md"
>
  <!-- Header & Body: Title, Metadata, and Menu -->
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 flex-1">
      <h3 class="truncate text-lg font-semibold text-gray-900">
        <!-- The link stretches to cover the whole card via before:inset-0 -->
        <a
          href="/activity/{activity.program.id}"
          class="before:absolute before:inset-0 before:z-0 focus:outline-none"
        >
          {activity.program.name}
        </a>
      </h3>

      <!-- Metadata row -->
      <div class="mt-1.5 flex items-center gap-x-2 text-sm text-gray-500">
        <span class="truncate">{studentLabel}</span>
        {#if timeLabel}
          <span class="flex-shrink-0 text-gray-300" aria-hidden="true">&middot;</span>
          <span class="truncate">{timeLabel}</span>
        {/if}
      </div>
    </div>

    <!-- Overflow menu (Top Right) -->
    <div class="overflow-menu relative z-10 flex-shrink-0">
      <button
        type="button"
        class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="More options for {activity.program.name}"
        onclick={(e) => {
          onToggleMenu(activity.program.id, e);
        }}
      >
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
          />
        </svg>
      </button>

      {#if isMenuOpen}
        <div
          class="absolute right-0 z-20 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onclick={() => {
              onRename(activity);
            }}
          >
            <svg
              class="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
              />
            </svg>
            Rename
          </button>
          <hr class="my-1 border-gray-100" />
          <button
            type="button"
            class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onclick={() => {
              onDelete(activity);
            }}
          >
            <svg
              class="h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Delete
          </button>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex-1"></div>

  <!-- Footer: Status & Affordance -->
  <div class="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
    <div class="text-sm font-medium">
      {#if activity.studentCount === 0}
        <span class="flex items-center gap-1.5 text-amber-600">
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Setup required
        </span>
      {:else}
        <span class="text-gray-500">Open activity</span>
      {/if}
    </div>

    <!-- Animated arrow indicating navigation -->
    <div
      class="text-gray-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-teal"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
        />
      </svg>
    </div>
  </div>
</div>
