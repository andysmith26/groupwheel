<script lang="ts">
  import type { Student } from '$lib/domain';
  import { getCanonicalId } from '$lib/domain/student';
  import type { StudentPreference } from '$lib/domain/preference';

  /**
   * Info about students this student has been grouped with recently.
   */
  interface RecentGroupmate {
    studentName: string;
    count: number;
  }

  const {
    student,
    preferences = null,
    recentGroupmates = [],
    x = 0,
    y = 0,
    visible = false,
    showProfileLink = false
  } = $props<{
    student: Student;
    preferences?: StudentPreference | null;
    /** Recent groupmates sorted by frequency (most frequent first) */
    recentGroupmates?: RecentGroupmate[];
    x?: number;
    y?: number;
    visible?: boolean;
    /** Whether to show the "View full profile" link */
    showProfileLink?: boolean;
  }>();

  const fullName = $derived(`${student.firstName} ${student.lastName ?? ''}`.trim() || student.id);

  const firstChoice = $derived(preferences?.likeGroupIds?.[0] ?? null);
  const secondChoice = $derived(preferences?.likeGroupIds?.[1] ?? null);

  // Show top 3 recent groupmates
  const topGroupmates = $derived(recentGroupmates.slice(0, 3));

  // Get canonical ID for profile link
  const profileId = $derived(getCanonicalId(student));

  // Position the tooltip to avoid going off-screen
  const tooltipStyle = $derived.by(() => {
    // Offset from cursor
    const offsetX = 12;
    const offsetY = 12;

    // Rough tooltip dimensions (larger if showing groupmates)
    const tooltipWidth = 220;
    const baseHeight = 96;
    const groupmatesHeight = topGroupmates.length > 0 ? 24 + topGroupmates.length * 20 : 0;
    const tooltipHeight = baseHeight + groupmatesHeight;

    // Check if tooltip would go off-screen
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

    let left = x + offsetX;
    let top = y + offsetY;

    // Flip horizontally if needed
    if (left + tooltipWidth > windowWidth - 20) {
      left = x - tooltipWidth - offsetX;
    }

    // Flip vertically if needed
    if (top + tooltipHeight > windowHeight - 20) {
      top = y - tooltipHeight - offsetY;
    }

    return `left: ${left}px; top: ${top}px;`;
  });
</script>

{#if visible}
  <div
    class="pointer-events-none fixed z-50 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
    style={tooltipStyle}
    role="tooltip"
  >
    <!-- Student name -->
    <div class="mb-2 font-semibold text-gray-900">{fullName}</div>
    <div class="text-sm text-gray-700">
      <div>1st Choice: {firstChoice ?? '—'}</div>
      <div>2nd Choice: {secondChoice ?? '—'}</div>
    </div>

    <!-- Recent groupmates -->
    {#if topGroupmates.length > 0}
      <div class="mt-2 border-t border-gray-100 pt-2">
        <div class="mb-1 text-xs font-medium text-gray-500">Recent groupmates:</div>
        <div class="space-y-0.5 text-xs text-gray-600">
          {#each topGroupmates as groupmate (groupmate.studentName)}
            <div class="flex justify-between">
              <span class="truncate">{groupmate.studentName}</span>
              <span class="ml-2 text-gray-400">{groupmate.count}x</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Profile link -->
    {#if showProfileLink}
      <div class="pointer-events-auto mt-2 border-t border-gray-100 pt-2">
        <a
          href="/students/{profileId}"
          class="flex items-center gap-1 text-xs text-teal hover:text-teal-dark hover:underline"
        >
          View full profile
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    {/if}
  </div>
{/if}
