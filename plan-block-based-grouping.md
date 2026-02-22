# Plan: Block-Based Quick Grouping Feature

## Problem Statement

Teachers need to:

1. Add class rosters for different blocks (periods) — **each block is a separate activity**
2. At the start of a block, select group size and generate randomized groups
3. Review/edit groups, then publish to show student-view — **this is when groups are recorded**
4. See history of previous sessions for that block

## Clarified Requirements

| Question                      | Answer                                                           |
| ----------------------------- | ---------------------------------------------------------------- |
| Multiple blocks per activity? | No — each block is its own activity (e.g., "Block A", "Block B") |
| Group naming                  | Default "Group 1, 2..." but customizable                         |
| Show session history?         | Yes — "Last grouped on Jan 24"                                   |
| Re-grouping behavior          | Always start fresh                                               |

## Simplified Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Activity Dashboard                                               │
│                                                                 │
│  [Block A]  [Block B]  [Block C]  [+ New Activity]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Start Session (NEW PAGE)                         /[id]/start    │
│                                                                 │
│  Block A                                    24 students         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Group size: [4 ▼]  students per group                   │   │
│  │                                                         │   │
│  │ This will create 6 groups                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Previous sessions:                                             │
│  • Jan 24, 2026 — 6 groups                                     │
│  • Jan 23, 2026 — 6 groups                                     │
│                                                                 │
│                                    [Generate Groups]            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Workspace (existing)                        /[id]/workspace     │
│                                                                 │
│  [Group 1]  [Group 2]  [Group 3]  [Group 4]  [Group 5]  [+]    │
│                                                                 │
│  Drag-drop editing, rename groups, etc.                         │
│                                                                 │
│                                    [Show to Class]              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Publish → Records Placements → Student View    /[id]/present    │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Quick Generate Use Case

**Create `quickGenerateGroups.ts`** (`src/lib/application/useCases/quickGenerateGroups.ts`)

Input:

```typescript
interface QuickGenerateInput {
  programId: string;
  groupSize: number;
  groupNamePrefix?: string; // default "Group"
}
```

Behavior:

- Fetches program and pool
- Calculates number of groups: `Math.ceil(studentCount / groupSize)`
- Generates group definitions: "Group 1", "Group 2", etc.
- Calls existing `groupingAlgorithm.generateGroups`
- Saves and returns Scenario

### Phase 2: Start Session Page

**Create `/activities/[id]/start/+page.svelte`**

Features:

- Shows activity name and student count
- Group size selector (dropdown or input)
- Calculates and displays "This will create N groups"
- Lists previous published sessions with dates
- "Generate Groups" button → calls `quickGenerateGroups` → navigates to workspace

### Phase 3: Update Activity Flow

**Modify activity dashboard** (`src/routes/activities/+page.svelte`)

- Primary action for existing activities: "Start Session" → `/[id]/start`

**Modify workspace** (`src/routes/activities/[id]/workspace/+page.svelte`)

- No major changes needed (already supports editing and publish)
- Ensure "Show to Class" flow creates session + placements

### Phase 4: Facade Wiring

**Update `appEnvUseCases.ts`**

- Add `quickGenerateGroups(env, input)` wrapper
- Add `listSessionsByProgram(env, { programId })` if not exists

---

## Files Summary

| Action | File Path                                                    |
| ------ | ------------------------------------------------------------ |
| Create | `src/lib/application/useCases/quickGenerateGroups.ts`        |
| Create | `src/routes/activities/[id]/start/+page.svelte`              |
| Modify | `src/routes/activities/+page.svelte` (change primary action) |
| Modify | `src/lib/services/appEnvUseCases.ts` (add facade)            |

---

## Detailed Component Specs

### Start Session Page

```svelte
<!-- /activities/[id]/start/+page.svelte -->

State: - groupSize: number (default 4) - isGenerating: boolean Computed: - studentCount: from pool -
groupCount: Math.ceil(studentCount / groupSize) - previousSessions: from listSessions Actions: -
handleGenerate(): 1. Call quickGenerateGroups(env, {(programId, groupSize)}) 2. Navigate to
/activities/[id]/workspace
```

### Quick Generate Use Case

```typescript
// src/lib/application/useCases/quickGenerateGroups.ts

export async function quickGenerateGroups(
  deps: {
    programRepo: ProgramRepository;
    poolRepo: PoolRepository;
    studentRepo: StudentRepository;
    scenarioRepo: ScenarioRepository;
    groupingAlgorithm: GroupingAlgorithm;
    idGenerator: IdGenerator;
  },
  input: {
    programId: string;
    groupSize: number;
    groupNamePrefix?: string;
  }
): Promise<Result<Scenario, QuickGenerateError>>;
```

---

## Ready for Implementation

Shall I proceed with Phase 1 (quickGenerateGroups use case)?
