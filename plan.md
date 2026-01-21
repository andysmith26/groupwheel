# Plan: In-List Reordering and Alphabetize Feature

## Summary

Add the ability to:
1. Drag and drop a student **between** other students within the same group (or unassigned area) to reorder
2. Provide an "Alphabetize" option that sorts all students in a group by last name (with a confirmation warning)

## Research Findings

### Current State

**Drag-and-drop library:** Atlassian's Pragmatic Drag and Drop (`@atlaskit/pragmatic-drag-and-drop`)

**Current behavior:**
- Students can be dragged **between containers** (groups ↔ unassigned)
- Students **cannot** be reordered within a group - they're always sorted alphabetically on render
- The `Group.memberIds` array exists but order is **not preserved** - it's re-sorted on every render (line 102-123 in `EditableGroupColumn.svelte`)

**Key files:**
- `src/lib/utils/pragmatic-dnd.ts` - Svelte actions for drag/drop
- `src/lib/components/editing/EditableGroupColumn.svelte` - Group container with student cards
- `src/lib/components/editing/UnassignedArea.svelte` - Unassigned student container
- `src/lib/stores/scenarioEditingStore.ts` - State management with undo/redo
- `src/lib/domain/group.ts` - Group entity (no explicit order field)

**Architecture constraints:**
- Domain layer is pure, no UI dependencies
- All significant operations go through the editing store (for undo/redo)
- Changes persist to IndexedDB via debounced auto-save

### What Needs to Change

1. **Stop auto-sorting on render** - Remove the alphabetical sort in `EditableGroupColumn.svelte`
2. **Preserve memberIds order** - The order in `Group.memberIds` becomes meaningful
3. **Add drop indicators** - Show visual gap where student will be inserted
4. **Handle insert-at-index** - New command type to insert at specific position
5. **Add alphabetize action** - Button + confirmation dialog + bulk reorder command

---

## Approach 1: Minimal Change - Position-Based Insert with Existing Commands (Recommended)

### What it does differently
Uses the existing `MOVE_STUDENT` command but adds an optional `targetIndex` parameter. The memberIds array order becomes the source of truth. No domain model changes needed.

### Files modified
1. `src/lib/stores/scenarioEditingStore.ts` - Add `targetIndex` to `MoveStudentCommand`, update `applyMove()`
2. `src/lib/components/editing/EditableGroupColumn.svelte` - Remove auto-sort, add drop indicators, pass index to callbacks
3. `src/lib/components/editing/UnassignedArea.svelte` - Same changes for unassigned area
4. `src/lib/utils/pragmatic-dnd.ts` - Enhance droppable to detect insert position between items
5. `src/routes/activities/[id]/workspace/+page.svelte` - Update `handleDrop` to pass index

### New files created
1. `src/lib/components/editing/DropIndicator.svelte` - Visual indicator for insert position
2. `src/lib/components/editing/AlphabetizeConfirmDialog.svelte` - Confirmation for bulk alphabetize

### Trade-offs
- **Implementation effort:** Moderate - pragmatic-dnd supports edge detection natively
- **Best-practice alignment:** Canonical - follows existing patterns, minimal new concepts
- **Maintenance burden:** Simple - reuses existing command system

---

## Approach 2: Explicit Position Field on Group Domain

### What it does differently
Adds a `memberOrder: string[]` field to the Group domain type that explicitly tracks order separate from membership. This provides a cleaner separation but requires domain changes.

### Files modified
1. `src/lib/domain/group.ts` - Add `memberOrder?: string[]` field
2. `src/lib/stores/scenarioEditingStore.ts` - New `REORDER_MEMBERS` command type
3. All files from Approach 1

### Trade-offs
- **Implementation effort:** Significant - domain changes ripple through
- **Best-practice alignment:** Acceptable - adds complexity but cleaner separation
- **Maintenance burden:** Manageable - need to keep memberIds and memberOrder in sync

---

## Approach 3: Virtual Ordering via algorithmConfig

### What it does differently
Stores order in `scenario.algorithmConfig` (similar to how `rowLayout` is stored), keeping domain model unchanged. Order is a "workspace preference" rather than domain data.

### Files modified
1. `src/routes/activities/[id]/workspace/+page.svelte` - Store/retrieve order from algorithmConfig
2. `src/lib/components/editing/EditableGroupColumn.svelte` - Accept order prop
3. `src/lib/stores/scenarioEditingStore.ts` - Still needs reorder support for undo/redo

### Trade-offs
- **Implementation effort:** Moderate
- **Best-practice alignment:** Acceptable - but order feels more like domain data than workspace preference
- **Maintenance burden:** Complex - mixing concerns, harder to reason about

---

## Recommendation

**Approach 1: Minimal Change with Position-Based Insert**

**Reasons:**
1. **Follows existing patterns** - Uses the same command/undo system already in place
2. **No domain changes** - `memberIds` array already exists and can hold order
3. **Pragmatic-dnd has native support** - The library provides `closestEdge` detection for insert position out of the box

**What would flip the choice:**
- If there's a future need to track order independently of membership (e.g., different orderings per view), Approach 2 would be better
- If order is truly ephemeral/non-persisted, Approach 3 might fit

---

## Implementation Steps

### Phase 1: Core Reordering Infrastructure
1. Update `MoveStudentCommand` to include optional `targetIndex: number`
2. Modify `applyMove()` to insert at index when specified
3. Update undo logic to restore previous position

### Phase 2: Drop Indicator UI
4. Create `DropIndicator.svelte` component (thin horizontal line)
5. Enhance `droppable` action to detect edge proximity (top/bottom of each card)
6. Update `EditableGroupColumn.svelte`:
   - Remove the alphabetical sorting on render
   - Track which card/edge is being hovered
   - Render drop indicators between cards

### Phase 3: Wire Up Callbacks
7. Update drop handlers to calculate and pass insertion index
8. Update `UnassignedArea.svelte` with same indicator system

### Phase 4: Alphabetize Feature
9. Add "Alphabetize" button to group header (or menu)
10. Create `AlphabetizeConfirmDialog.svelte` with warning about bulk change
11. Add `REORDER_GROUP` command to scenarioEditingStore for bulk operations
12. Implement alphabetize logic (sort by lastName, firstName)

### Phase 5: Polish
13. Ensure keyboard accessibility for reorder
14. Add subtle animations for drop feedback
15. Test undo/redo with reorder operations

---

## Risk Assessment

**Low risk:**
- Pragmatic-dnd's `closestEdge` is well-documented and stable
- No breaking changes to external APIs or domain model

**Medium risk:**
- Performance with large lists (mitigated: lists are typically <40 students)
- Edge cases in undo/redo with combined move+reorder operations

**Mitigations:**
- Comprehensive unit tests for reorder scenarios
- Manual QA of undo stack with various operation sequences
