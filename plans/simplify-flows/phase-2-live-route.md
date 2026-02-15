# Phase 2: Live Route (Merge Present + Observe)

## Goal

Create a single `/activities/[id]/live` route that replaces both `/present` and `/observe`. Two tabs:

- **Student View** — clean projection mode (Find My Group search + All Groups grid). Optimized for projectors.
- **Teacher View** — observation cards with sentiment buttons + notes. Optimized for iPad.

A "Done" button archives the session and returns to the workspace.

## Prerequisites

None — can be implemented in parallel with Phase 1. However, if Phase 1 is done first, the workspace will navigate to `/live` instead of `/present`.

## Context Files to Read

1. **`src/routes/activities/[id]/present/+page.svelte`** — Student-facing view. Has search tab, all-groups tab, observation toggle, "Done" button. ~436 lines.
2. **`src/routes/activities/[id]/observe/+page.svelte`** — Teacher observation view. iPad-optimized grid with sentiment buttons. Requires active session. ~266 lines.
3. **`src/lib/components/session/ObservationGroupCard.svelte`** — Reusable card for observe view. Keep as-is.
4. **`src/lib/components/session/ObservationForm.svelte`** — Observation form. Keep as-is.
5. **`src/lib/components/session/ObservationList.svelte`** — Observation list. Keep as-is.
6. **`src/lib/services/appEnvUseCases.ts`** — Use case wiring. Needs: `getStudentActivityView`, `getActiveSession`, `createObservation`, `listObservationsBySession`, `listObservationsByProgram`, `endSession`.

## Design

### Tab Structure

```
┌───────────────────────────────────────────────────────────┐
│  Period 3 Math          🟢 Live          [Done]          │
│                                                           │
│  [ Student View ]  [ Teacher View ]                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  (Tab content renders here)                               │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Student View Tab (from Present)

- "Find My Group" search with large input
- "All Groups" sub-toggle showing grid of group cards
- Large text optimized for projection
- NO observation UI (that's Teacher View's job)

### Teacher View Tab (from Observe)

- Grid of `ObservationGroupCard` components
- Large tap targets for sentiment (positive/neutral/negative)
- Note-taking per group
- iPad touch-action: manipulation

### Header

- Activity name (left)
- "Live" badge with green pulse (center) — only shown when active session exists
- "Done" button (right) — archives session, navigates back

### "Done" Behavior

1. Call `endSession({ programId })` to archive the active session
2. Navigate to `/activities/[id]/workspace`

### No Active Session Behavior

If someone navigates to `/live` without an active session (e.g., via direct URL):
- Show the Student View with groups (read-only, no "Live" badge)
- Teacher View shows a message: "Show to Class from the workspace to start recording observations"
- "Done" button still works (just navigates back, no session to archive)

This lets the page double as a preview without requiring a session.

## Implementation Steps

### Step 1: Extract shared utilities

**Create:** `src/lib/utils/groupColors.ts`

Extract the duplicated `getGroupColor()` and `GROUP_COLORS` from both Present and Observe:

```typescript
export const GROUP_COLORS = [
  'bg-teal',
  'bg-blue-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-amber-500',
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-pink-600'
];

export function getGroupColor(groupName: string): string {
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}
```

### Step 2: Create the StudentView component

**Create:** `src/lib/components/live/StudentView.svelte`

Extract the student-facing UI from Present page (search + all-groups). This component receives data as props — no data loading.

```typescript
// Props
interface Props {
  program: Program;
  groupedAssignments: [string, Assignment[]][];
  membersByGroup: Map<string, string[]>;
}
```

Contains:
- View mode toggle: "Find My Group" / "All Groups" (sub-tabs within the Student View)
- Search input + filtered results (from Present)
- All-groups grid (from Present)
- NO observation UI

### Step 3: Create the TeacherView component

**Create:** `src/lib/components/live/TeacherView.svelte`

Extract the teacher observation grid from Observe page.

```typescript
// Props
interface Props {
  groupedAssignments: [string, Assignment[]][];
  observations: Observation[];
  activeSession: Session | null;
  onSentiment: (groupId: string, groupName: string, sentiment: ObservationSentiment) => void;
  onNote: (groupId: string, groupName: string, note: string) => void;
}
```

Contains:
- Grid of `ObservationGroupCard` components
- Observation count per group
- If no active session: show message "Show to Class from workspace to start recording"

### Step 4: Create the Live page

**Create:** `src/routes/activities/[id]/live/+page.svelte`

This is the main page that composes StudentView + TeacherView with tab switching.

```typescript
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import type { Program, Scenario, Student, Observation, Session } from '$lib/domain';
  import type { ObservationSentiment } from '$lib/domain/observation';
  import { buildAssignmentList } from '$lib/utils/csvExport';
  import { getGroupColor } from '$lib/utils/groupColors';
  import {
    getStudentActivityView,
    getActiveSession,
    createObservation,
    listObservationsBySession,
    listObservationsByProgram,
    endSession
  } from '$lib/services/appEnvUseCases';
  import { isErr, isOk } from '$lib/types/result';
  import StudentView from '$lib/components/live/StudentView.svelte';
  import TeacherView from '$lib/components/live/TeacherView.svelte';

  // State
  let env = $state(null);
  let program = $state<Program | null>(null);
  let scenario = $state<Scenario | null>(null);
  let students = $state<Student[]>([]);
  let activeSession = $state<Session | null>(null);
  let observations = $state<Observation[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let isEnding = $state(false);

  // Tab state — default to Student View (projection-first)
  let activeTab = $state<'student' | 'teacher'>('student');

  // Derived
  let studentsById = $derived(new Map(students.map(s => [s.id, s])));
  let assignments = $derived.by(() => {
    if (!scenario) return [];
    return buildAssignmentList(scenario.groups, studentsById);
  });
  // ... (grouped assignments, membersByGroup — same as present page)

  // Load data on mount
  onMount(async () => {
    env = getAppEnvContext();
    await loadData();
  });

  async function loadData() { /* load program, scenario, students, session, observations */ }

  async function handleSentiment(groupId, groupName, sentiment) { /* create observation */ }
  async function handleNote(groupId, groupName, note) { /* create observation */ }

  async function handleDone() {
    if (!env || !program) return;
    isEnding = true;
    if (activeSession) {
      await endSession(env, { programId: program.id });
    }
    goto(`/activities/${program.id}/workspace`);
  }
</script>
```

**Template structure:**

```svelte
<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="border-b-2 border-gray-300 bg-white">
    <div class="mx-auto max-w-6xl px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-bold text-gray-900">{program.name}</h1>
          {#if activeSession}
            <span class="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
              <span class="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span class="text-sm font-medium text-green-700">Live</span>
            </span>
          {/if}
        </div>
        <button onclick={handleDone} class="rounded-lg bg-gray-800 px-6 py-3 text-lg font-semibold text-white hover:bg-gray-700">
          Done
        </button>
      </div>

      <!-- Tabs -->
      <div class="mt-4 flex gap-2">
        <button class="tab-button" class:active={activeTab === 'student'} onclick={() => activeTab = 'student'}>
          Student View
        </button>
        <button class="tab-button" class:active={activeTab === 'teacher'} onclick={() => activeTab = 'teacher'}>
          Teacher View
        </button>
      </div>
    </div>
  </header>

  <!-- Content -->
  <main class="mx-auto max-w-6xl px-6 py-8">
    {#if activeTab === 'student'}
      <StudentView {program} {groupedAssignments} {membersByGroup} />
    {:else}
      <TeacherView
        {groupedAssignments}
        {observations}
        {activeSession}
        onSentiment={handleSentiment}
        onNote={handleNote}
      />
    {/if}
  </main>
</div>
```

### Step 5: ESC key handler

Add keyboard handler from Present page: ESC returns to workspace.

```typescript
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleDone();
  }
}
```

### Step 6: Update workspace navigation

**Modify:** `src/routes/activities/[id]/workspace/+page.svelte`

Change all navigation to `/present` → `/live`:

- `handlePublishAndPresent()`: `goto('/activities/${program.id}/live')`
- `handlePostPublishShowToClass()`: `window.open('/activities/${program.id}/live', '_blank')`
- `handleJustPreview()`: `goto('/activities/${program.id}/live')`
- `handlePostPublishOpenBoth()`: the observe URL → `/live`

### Step 7: Update observe page redirect

**Modify:** `src/routes/activities/[id]/observe/+page.svelte`

Add a redirect at the top of `loadData()`:

```typescript
// Redirect to new live route
goto(`/activities/${$page.params.id}/live`);
return;
```

This preserves any bookmarks/links to `/observe` during transition. Full deletion happens in Phase 5.

### Step 8: Update present page redirect

**Modify:** `src/routes/activities/[id]/present/+page.svelte`

Same redirect pattern:

```typescript
goto(`/activities/${$page.params.id}/live`);
return;
```

## Files Changed Summary

| File | Action |
|------|--------|
| `src/lib/utils/groupColors.ts` | CREATE |
| `src/lib/components/live/StudentView.svelte` | CREATE |
| `src/lib/components/live/TeacherView.svelte` | CREATE |
| `src/routes/activities/[id]/live/+page.svelte` | CREATE |
| `src/routes/activities/[id]/workspace/+page.svelte` | MODIFY (navigation URLs) |
| `src/routes/activities/[id]/present/+page.svelte` | MODIFY (add redirect to /live) |
| `src/routes/activities/[id]/observe/+page.svelte` | MODIFY (add redirect to /live) |

## Do NOT Touch

- `createSession.ts` / `publishSession.ts` — Phase 1 or Phase 5
- `/start` route — Phase 3
- Activity detail page — Phase 4
- `ObservationGroupCard.svelte` — reused as-is
- `ObservationForm.svelte`, `ObservationList.svelte` — reused as-is
- Any repository or domain code

## Verification

1. Navigate to `/activities/[id]/live` — page loads with Student View tab active
2. Student View: search works, all-groups grid displays correctly
3. Teacher View: observation cards display, sentiment taps create observations
4. "Done" button archives session and navigates to workspace
5. Direct URL to `/live` without active session: Student View works, Teacher View shows message
6. Old `/present` and `/observe` URLs redirect to `/live`
7. Workspace "Show to Class" navigates to `/live`
8. ESC key returns to workspace
9. E2E: `pnpm test:e2e` — present-flow and drag-drop tests updated or passing
