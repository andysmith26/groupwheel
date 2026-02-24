# Phase 4: Smart Activity Entry Point

## Goal

Transform the activity detail page (`/activities/[id]`) into a smart entry point that serves both personas:

- **Math teacher (daily):** One tap "New Groups" → generates fresh groups + opens workspace. Three taps from app open to projector.
- **Clubs admin (semester):** "Edit Current Groups" → full workspace. Or go through Setup for roster/preferences.

## Prerequisites

- Phase 1 (showToClass use case)
- Phase 2 (live route)
- Phase 3 (workspace inline generation)

## Context Files to Read

1. **`src/routes/activities/[id]/+page.svelte`** — Current activity detail page. Has collapsible sections for Students, Groups (shells), History. Has "Generate Groups" button that calls `generateCandidate()` directly. ~500+ lines.
2. **`src/routes/activities/[id]/workspace/+page.svelte`** — Workspace page. Understand what state it expects.
3. **`src/lib/application/useCases/quickGenerateGroups.ts`** — For the "New Groups" one-tap action.
4. **`src/lib/services/appEnvUseCases.ts`** — Service wiring.
5. **`src/routes/activities/+page.svelte`** — Activities list page. Understand how users get to an activity.

## Design

### Activity Detail Page Layout

The page should clearly present the two primary actions, with setup/history accessible but not dominant:

```
┌──────────────────────────────────────────────────┐
│  ← Activities                                    │
│                                                  │
│  Period 3 Math                      24 students  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  ↻  New Groups                           │    │
│  │  Groups of 4 · avoid recent groupmates   │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  ✏  Edit Current Groups                  │    │
│  │  6 groups · last shown Mon Feb 9         │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ─────────────────────────────────────────────   │
│                                                  │
│  Setup                                     ›     │
│  Students · Group Names · Preferences            │
│                                                  │
│  History                                   ›     │
│  3 past groupings                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

### "New Groups" Button

**Behavior:**

1. Calls `quickGenerateGroups()` with remembered settings (last group size, avoid-recent preference)
2. On success → navigates to `/workspace`
3. One tap from this page to fresh groups in workspace

**Settings memory:** Store last-used group size and avoid-recent toggle in the activity's `algorithmConfig` or localStorage. This way the teacher doesn't re-pick "4" every day.

**Subtitle:** Shows "Groups of {size}" and "avoid recent groupmates" based on stored settings. Small gear icon or "Change" link to adjust size without going to workspace.

### "Edit Current Groups" Button

**Behavior:**

1. Navigate to `/workspace`
2. Only shown when a scenario exists (groups have been generated before)

**Subtitle:** Shows group count and last-shown date (from latest session's `publishedAt`).

### "Setup" Section

Collapsed by default. Contains:

- Student roster management (add/remove/import)
- Group name/shell configuration
- Preferences import

This is the current activity detail page content, reorganized as a secondary section.

### "History" Section

Collapsed by default. Shows past sessions (date, group count). Links to analytics if available.

### First-Time State (No Groups Yet)

When no scenario exists and no groups have been generated:

```
┌──────────────────────────────────────────────────┐
│  Period 3 Math                      24 students  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Generate your first groups              │    │
│  │                                          │    │
│  │  Students per group                      │    │
│  │     [-]  4  [+]                          │    │
│  │  6 groups                                │    │
│  │                                          │    │
│  │  [ Generate Groups ]                     │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Setup                                     ›     │
└──────────────────────────────────────────────────┘
```

After first generation, show the two-button layout.

## Implementation Steps

### Step 1: Store generation settings

**Create:** `src/lib/utils/generationSettings.ts`

Simple localStorage wrapper for per-activity generation preferences:

```typescript
interface GenerationSettings {
  groupSize: number;
  avoidRecentGroupmates: boolean;
}

const STORAGE_KEY_PREFIX = 'gw-gen-settings-';

export function getGenerationSettings(programId: string): GenerationSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${programId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { groupSize: 4, avoidRecentGroupmates: true };
}

export function saveGenerationSettings(programId: string, settings: GenerationSettings): void {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${programId}`, JSON.stringify(settings));
}
```

### Step 2: Redesign the activity detail page

**Modify:** `src/routes/activities/[id]/+page.svelte`

This is a significant rewrite of the page layout. The current page has expandable sections (Students, Groups, History). The new page has:

**Top section (always visible):**

- Activity name + student count
- "New Groups" card button (if students exist)
- "Edit Current Groups" card button (if scenario exists)

**Bottom section (collapsible):**

- "Setup" accordion → contains current Students section, Group shells section, Preferences
- "History" accordion → contains current History section

**Key state additions:**

```typescript
let generationSettings = $state<GenerationSettings>({ groupSize: 4, avoidRecentGroupmates: true });
let isGeneratingNew = $state(false);
```

**"New Groups" handler:**

```typescript
async function handleNewGroups() {
  if (!env || !program) return;
  isGeneratingNew = true;

  saveGenerationSettings(program.id, generationSettings);

  const result = await quickGenerateGroups(env, {
    programId: program.id,
    groupSize: generationSettings.groupSize,
    groupNamePrefix: 'Group',
    avoidRecentGroupmates: generationSettings.avoidRecentGroupmates
  });

  if (isErr(result)) {
    // Show error inline
    isGeneratingNew = false;
    return;
  }

  goto(`/activities/${program.id}/workspace`);
}
```

**On mount, load settings:**

```typescript
generationSettings = getGenerationSettings(program.id);

// Auto-set avoidRecent based on whether there are published sessions
const published = sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED');
if (published.length === 0) {
  generationSettings.avoidRecentGroupmates = false;
}
```

### Step 3: Group size quick-edit

Add a small inline editor on the "New Groups" card for changing group size without a separate page:

```svelte
<div
  class="cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-teal"
  onclick={handleNewGroups}
>
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">New Groups</h2>
      <p class="text-sm text-gray-500">
        Groups of {generationSettings.groupSize}
        {#if generationSettings.avoidRecentGroupmates}
          · avoid recent groupmates
        {/if}
      </p>
    </div>
    <button
      class="text-sm text-gray-400 hover:text-gray-600"
      onclick|stopPropagation={() => (showSettingsPopover = true)}
    >
      Change
    </button>
  </div>
</div>
```

The "Change" button opens a small popover/dropdown with the group size picker and avoid-recent toggle — same UI as the InlineGroupGenerator from Phase 3 but in a popover. Clicking the card itself generates immediately with current settings.

### Step 4: Update the activities list page

**Modify:** `src/routes/activities/+page.svelte`

If the activities list currently has any special navigation to `/start`, update those links to go to `/activities/[id]` (the detail page). The detail page is now the smart entry point.

### Step 5: Also update InlineGroupGenerator to save settings

**Modify:** `src/lib/components/workspace/InlineGroupGenerator.svelte` (from Phase 3)

When generating from the workspace's inline generator, also save the settings:

```typescript
import { saveGenerationSettings } from '$lib/utils/generationSettings';

// In generate handler:
saveGenerationSettings(programId, { groupSize, avoidRecentGroupmates });
```

This way the activity detail page's "New Groups" always uses the most recent settings.

## Files Changed Summary

| File                                                       | Action                                     |
| ---------------------------------------------------------- | ------------------------------------------ |
| `src/lib/utils/generationSettings.ts`                      | CREATE                                     |
| `src/routes/activities/[id]/+page.svelte`                  | MODIFY (major layout redesign)             |
| `src/routes/activities/+page.svelte`                       | MODIFY (update navigation links if needed) |
| `src/lib/components/workspace/InlineGroupGenerator.svelte` | MODIFY (save settings on generate)         |

## Do NOT Touch

- Workspace editing UI
- Live route
- Any use cases or domain code
- Repository layer
- Existing setup sections (Students, Group shells) — just reorganize within the page

## Verification

1. Activity detail page shows "New Groups" and "Edit Current Groups" buttons
2. "New Groups" → generates groups → opens workspace with new groups (one tap)
3. "Edit Current Groups" → opens workspace with existing groups
4. First-time activity (no groups) shows inline group size picker
5. Group size setting persists across visits (localStorage)
6. "Avoid recent groupmates" only appears when prior sessions exist
7. "Change" on New Groups card lets you adjust size without navigating away
8. Setup section is accessible but collapsed
9. History section shows past groupings
10. Math teacher can go from activity list to projector in 3 taps:
    Activity list → tap activity → tap "New Groups" → workspace → tap "Show to Class" → live
    (OK that's 4 taps, but generation + show is 2 taps from the detail page)
