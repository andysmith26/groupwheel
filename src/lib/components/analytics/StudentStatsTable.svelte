<script lang="ts">
  /**
   * StudentStatsTable.svelte
   *
   * Sortable table showing per-student satisfaction statistics.
   * Columns: Name, Sessions, 1st Choice %, Avg Rank
   */

  import type { StudentStat } from '$lib/application/useCases/listStudentStats';

  interface Props {
    /** Student statistics */
    students: StudentStat[];
    /** Total number of sessions analyzed */
    totalSessions: number;
    /** Whether data is loading */
    isLoading?: boolean;
  }

  let { students, totalSessions, isLoading = false }: Props = $props();

  type SortKey = 'name' | 'sessions' | 'firstChoice' | 'avgRank';
  type SortDir = 'asc' | 'desc';

  let sortKey = $state<SortKey>('name');
  let sortDir = $state<SortDir>('asc');

  let sortedStudents = $derived(() => {
    const sorted = [...students];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.studentName.localeCompare(b.studentName);
          break;
        case 'sessions':
          cmp = a.totalPlacements - b.totalPlacements;
          break;
        case 'firstChoice':
          cmp = a.firstChoicePercent - b.firstChoicePercent;
          break;
        case 'avgRank':
          // Null ranks go to the end
          if (a.avgRank === null && b.avgRank === null) cmp = 0;
          else if (a.avgRank === null) cmp = 1;
          else if (b.avgRank === null) cmp = -1;
          else cmp = a.avgRank - b.avgRank;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      // Default directions: name asc, others desc (higher is better except avgRank)
      sortDir = key === 'name' || key === 'avgRank' ? 'asc' : 'desc';
    }
  }

  function getSortIcon(key: SortKey): string {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ^' : ' v';
  }

  function getFirstChoiceBadgeClass(percent: number): string {
    if (percent >= 80) return 'bg-green-100 text-green-700';
    if (percent >= 50) return 'bg-yellow-100 text-yellow-700';
    if (percent >= 25) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  }
</script>

<div class="space-y-4">
  {#if isLoading}
    <div class="flex items-center justify-center py-8">
      <p class="text-gray-500">Loading student statistics...</p>
    </div>
  {:else if students.length === 0}
    <div class="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
      <p class="text-gray-500">No student data yet.</p>
      <p class="mt-1 text-sm text-gray-400">Statistics are calculated from published sessions.</p>
    </div>
  {:else}
    <!-- Summary -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-600">
        <span class="font-medium">{students.length}</span> student{students.length === 1 ? '' : 's'}
        across
        <span class="font-medium">{totalSessions}</span> session{totalSessions === 1 ? '' : 's'}
      </p>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
              onclick={() => handleSort('name')}
            >
              Student{getSortIcon('name')}
            </th>
            <th
              class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
              onclick={() => handleSort('sessions')}
            >
              Sessions{getSortIcon('sessions')}
            </th>
            <th
              class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
              onclick={() => handleSort('firstChoice')}
            >
              1st Choice{getSortIcon('firstChoice')}
            </th>
            <th
              class="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
              onclick={() => handleSort('avgRank')}
            >
              Avg Rank{getSortIcon('avgRank')}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each sortedStudents() as student (student.studentId)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                {student.studentName}
              </td>
              <td class="px-4 py-3 text-center text-sm whitespace-nowrap text-gray-600">
                {student.totalPlacements}
              </td>
              <td class="px-4 py-3 text-center whitespace-nowrap">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium {getFirstChoiceBadgeClass(
                    student.firstChoicePercent
                  )}"
                >
                  {student.firstChoicePercent}%
                </span>
              </td>
              <td class="px-4 py-3 text-center text-sm whitespace-nowrap text-gray-600">
                {student.avgRank !== null ? student.avgRank.toFixed(1) : '-'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
