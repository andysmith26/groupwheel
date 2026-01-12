# Plan: First-Choice Placement with Over-Enrollment Support

## Problem Statement

In the auto-placement and drag-and-drop workspace, the user wants:
1. **"Give everyone their first choice" algorithm option** - A new placement mode that assigns all students to their first preference, ignoring capacity limits
2. **Over-enrollment visibility** - Visual and numerical indicators when groups exceed capacity
3. **Preference display on student cards** - Show each student's 1st/2nd choices directly on their card for easy visual reference
4. **Current placement indication** - Subtle indicator showing which of their choices a student is currently in

## Research Findings

### Current Architecture

**Key files involved:**
- `src/lib/algorithms/balanced-assignment.ts` - Current algorithm respects capacity (lines 104, 138)
- `src/lib/stores/scenarioEditingStore.ts` - Blocks moves to full groups via `validateMove()` (lines 738-746)
- `src/lib/domain/group.ts` - `isGroupFull()` enforces capacity (line 121-126)
- `src/lib/components/editing/DraggableStudentCard.svelte` - Shows star for 1st choice only
- `src/lib/components/editing/EditableGroupColumn.svelte` - Shows capacity progress bar (gray/amber/red)
- `src/lib/utils/groups.ts` - `getCapacityStatus()` returns colors for capacity states

**Preference data flow:**
- Preferences stored as `StudentPreference.likeGroupIds[]` (ordered list)
- Workspace page computes `studentPreferenceRanks` map from preferences to groups
- `DraggableStudentCard` receives `preferenceRank` prop (only shows star if rank === 1)
- `StudentInfoTooltip` shows full preference list on hover (1st, 2nd, 3rd...)

**Current capacity enforcement:**
1. Algorithm: `remainingCapacity(group) > 0` check (balanced-assignment.ts:104)
2. Store validation: `isGroupFull(targetGroup)` blocks moves (scenarioEditingStore.ts:743)
3. UI: Progress bar turns red at 100%, but no "over" state

### Architectural Constraints

Per `docs/ARCHITECTURE.md`:
- New algorithm logic belongs in `src/lib/algorithms/`
- UI changes belong in `src/lib/components/`
- Domain helper changes belong in `src/lib/domain/`
- No business logic in components (only presentation)
- Algorithm catalog lives in `src/lib/application/algorithmCatalog.ts`

---

## Proposed Approaches

### Approach A: Algorithm Flag + Soft Capacity (Recommended)

**What it does:**
- Adds a new algorithm option "First Choice Only" that ignores capacity
- Modifies capacity enforcement to distinguish "soft" vs "hard" capacity
- Allows over-enrollment for algorithm-generated placements, but warns visually

**Files modified:**
1. `src/lib/algorithms/first-choice-only.ts` (NEW) - New algorithm that assigns everyone to first choice
2. `src/lib/application/algorithmCatalog.ts` - Add new algorithm entry
3. `src/lib/application/useCases/generateCandidate.ts` - Wire up new algorithm
4. `src/lib/stores/scenarioEditingStore.ts` - Allow moves to over-capacity groups (remove hard block, or make configurable)
5. `src/lib/domain/group.ts` - Add `isOverEnrolled()` helper
6. `src/lib/utils/groups.ts` - Extend `getCapacityStatus()` to return over-enrolled state with distinct styling
7. `src/lib/components/editing/EditableGroupColumn.svelte` - Show over-enrollment indicator (e.g., "+3 over")
8. `src/lib/components/editing/DraggableStudentCard.svelte` - Display 1st/2nd choice preferences inline

**Trade-offs:**
- Implementation effort: Moderate (new algorithm + UI changes)
- Best-practice alignment: Canonical (proper layering, new algorithm file)
- Maintenance burden: Manageable (clear separation of concerns)

---

### Approach B: Config-Based Capacity Override

**What it does differently:**
- Instead of a new algorithm, adds an "Allow over-enrollment" toggle to existing algorithms
- Capacity becomes advisory rather than enforced when toggle is on

**Files modified:**
1. `src/lib/algorithms/balanced-assignment.ts` - Add `allowOverEnrollment: boolean` config option
2. `src/lib/stores/scenarioEditingStore.ts` - Store toggle state, conditionally skip capacity check
3. Same UI changes as Approach A (items 5-8)

**Trade-offs:**
- Implementation effort: Quick win (fewer files, no new algorithm)
- Best-practice alignment: Acceptable (config flag approach is common)
- Maintenance burden: Simple (single toggle controls behavior)

---

### Approach C: Modal Capacity System

**What it does differently:**
- Introduces a "capacity mode" concept: strict, soft, or none
- Groups can have different enforcement levels
- More flexible but more complex

**Files modified:**
1. `src/lib/domain/group.ts` - Add `capacityMode: 'strict' | 'soft' | 'none'` field
2. Multiple algorithm files to respect the mode
3. Repository changes for persistence
4. Extensive UI changes

**Trade-offs:**
- Implementation effort: Significant (domain model change, migrations)
- Best-practice alignment: Canonical (proper modeling)
- Maintenance burden: Complex (more states to handle)

---

## Recommendation: Approach A (Algorithm Flag + Soft Capacity)

**Reasons:**
1. **Clean separation** - "First Choice Only" is a distinct algorithm with clear semantics, not a config hack on existing algorithms
2. **Explicit intent** - Users choosing this algorithm understand they're opting into over-enrollment
3. **Minimal domain changes** - No schema changes, just new helper functions

**What would flip the choice:**
- If users need per-group capacity control: Approach C
- If implementation speed is critical and first-choice-only is rarely used: Approach B

---

## Detailed Implementation Plan

### Phase 1: Algorithm & Domain Layer

1. **Create `src/lib/algorithms/first-choice-only.ts`**
   - Export `assignFirstChoiceOnly(options: AssignmentOptions): AssignmentResult`
   - For each student with preferences: assign to first choice regardless of capacity
   - Students without preferences: leave unassigned (or balanced fill)

2. **Update `src/lib/application/algorithmCatalog.ts`**
   - Add entry: `{ id: 'first-choice-only', label: 'First Choice Only' }`

3. **Add domain helper `src/lib/domain/group.ts`**
   - `isOverEnrolled(group: Group): boolean` - returns true if memberIds.length > capacity

4. **Update `src/lib/utils/groups.ts`**
   - Extend `getCapacityStatus()` to include `isOverEnrolled: boolean` and distinct color (e.g., purple or darker red)

### Phase 2: Store & Validation Layer

5. **Update `src/lib/stores/scenarioEditingStore.ts`**
   - Option A: Remove the `isGroupFull()` block entirely (always allow moves)
   - Option B: Add store-level config `allowOverEnrollment` that skips the check
   - Recommended: Option A for simplicity - let users move students anywhere, show visual warnings

### Phase 3: UI Components

6. **Update `src/lib/components/editing/EditableGroupColumn.svelte`**
   - Show over-enrollment indicator: e.g., "8/5 (+3)" with red/purple styling
   - Progress bar extends beyond 100% with distinct visual (striped or pulsing)

7. **Update `src/lib/components/editing/DraggableStudentCard.svelte`**
   - Display 1st and 2nd choice preferences compactly below name
   - Format: "1st: Band, 2nd: Choir" in smaller text
   - Highlight current group match: if student is in their 1st choice, show checkmark or green highlight on "1st"; same for 2nd

8. **Update workspace page if needed**
   - Ensure `selectedStudentPreferences` data flows correctly to new card display

---

## Visual Design Concepts

### Student Card (DraggableStudentCard)
```
+-----------------------------+
| Alice Smith              *  |  <- Star if got 1st choice
| 1st: Band (checkmark)  2nd: Choir     |  <- Preferences with checkmark on current
+-----------------------------+
```

If in 2nd choice:
```
+-----------------------------+
| Bob Jones                   |
| 1st: Band    2nd: Choir (checkmark)   |  <- Checkmark moves to 2nd
+-----------------------------+
```

### Over-Enrolled Group
```
+-----------------------------+
| Band                        |
| 8 / 5  [========+3]         |  <- Red bar extends with "+3" label
| Warning: Over capacity      |  <- Warning badge
+-----------------------------+
| [Alice Smith]               |
| [Bob Jones]                 |
| ...                         |
+-----------------------------+
```

### Subtle preference match indication
- If in 1st choice: small green dot or checkmark on card
- If in 2nd choice: small teal/blue indicator
- No explicit "not a preference" indicator (absence of indicator is sufficient)

---

## Questions for Clarification

1. **Drag-drop behavior**: Should users be able to manually drag students into over-capacity groups, or only via the "First Choice Only" algorithm?
   - Recommendation: Allow both - makes manual adjustment easier

2. **Unassigned handling in first-choice algorithm**: What happens to students with no preferences?
   - Option A: Leave unassigned
   - Option B: Balanced fill after preference students are placed
   - Recommendation: Option B for teacher convenience

3. **Preference display depth**: Show 1st and 2nd only, or 1st/2nd/3rd?
   - Recommendation: 1st and 2nd (keeps cards compact)

---

## Files Summary

| File | Action | Layer |
|------|--------|-------|
| `src/lib/algorithms/first-choice-only.ts` | Create | Algorithm |
| `src/lib/application/algorithmCatalog.ts` | Modify | Application |
| `src/lib/domain/group.ts` | Modify | Domain |
| `src/lib/utils/groups.ts` | Modify | Utility |
| `src/lib/stores/scenarioEditingStore.ts` | Modify | Store |
| `src/lib/components/editing/EditableGroupColumn.svelte` | Modify | UI |
| `src/lib/components/editing/DraggableStudentCard.svelte` | Modify | UI |

---

## Tests to Add

- Unit test for `assignFirstChoiceOnly` algorithm
- Unit test for `isOverEnrolled` helper
- Unit test for updated `getCapacityStatus` with over-enrollment
- Component test for DraggableStudentCard preference display
