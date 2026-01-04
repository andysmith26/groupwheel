# UX Redesign: Task-Based Architecture (Approach C)

## Context

Teachers have no patience to learn new tools. The UX must be immediately obvious. Based on analysis of 14 routes, 39 components, and the accumulated complexity, we're doing a complete task-based restructure.

---

## Part 1: New UX Principles

### 1. One Task Per Screen
Each screen answers exactly one question:
- "Which activity?" → Dashboard
- "What groups do I have?" → Setup
- "Who goes where?" → Workspace
- "How do I show the class?" → Present

### 2. Linear Paths, Not Webs
Navigation is forward/back, not a maze of options. Every screen has one primary action and one escape route.

### 3. Teacher Vocabulary Only
No domain jargon (scenario, pool, program). Use teacher language:
- "Activity" not "Program"
- "Roster" not "Pool"
- "Groups" not "Scenario"
- "Students" not "Members"

### 4. Smart Defaults Over Configuration
Algorithm runs automatically. Good enough for 90% of cases. Power features hidden until needed.

### 5. State is Obvious
At any moment, teachers know:
- Where they are
- What they can do
- How to get back

---

## Part 2: New Route Architecture

### Current Routes (14)
```
/
/groups
/groups/new
/groups/new/sheets
/groups/templates
/groups/[id]
/groups/[id]/candidates
/groups/[id]/students
/groups/[id]/students/[studentId]
/groups/[id]/sessions
/auth/login
/auth/callback/complete
/algorithms
```

### New Routes (9)
```
/                                   Landing page (unchanged)
/activities                         Dashboard (renamed from /groups)
/activities/new                     Streamlined wizard
/activities/[id]                    Activity hub (smart redirect)
/activities/[id]/setup              Configure groups & preferences
/activities/[id]/workspace          Drag-drop editing (pure workspace)
/activities/[id]/present            Student view (presentation mode)
/auth/login                         OAuth login (unchanged)
/auth/callback/complete             OAuth callback (unchanged)
```

### Removed Routes
- `/groups/templates` → Inline in setup
- `/groups/[id]/candidates` → Inline options in workspace
- `/groups/[id]/students/[studentId]` → Remove (rarely used)
- `/groups/[id]/sessions` → Inline in activity hub
- `/algorithms` → Remove (move to help/docs)
- `/groups/new/sheets` → Inline in wizard

---

## Part 3: Task Flows

### Flow 1: First-Time Teacher
```
Landing → Create Activity → Wizard (3 steps) → Workspace → Present
```

**Wizard Steps (simplified to 3):**
1. **Students**: Paste roster (or connect sheet)
2. **Groups**: Name your groups (or let us split automatically)
3. **Review**: Preview and create

**Key changes:**
- No separate preferences step (inline with groups)
- No name step (auto-generate from first group or roster)
- No candidate gallery (auto-pick best option, can regenerate in workspace)

### Flow 2: Returning Teacher
```
Dashboard → [Activity Card] → Workspace (or Setup if needs changes)
```

**Activity cards show:**
- Activity name
- Student count
- Quick status (Editing / Published)
- Primary action: "Edit Groups" or "View"

### Flow 3: Teacher Making Changes
```
Workspace → (drag students) → (auto-saves) → Present when ready
```

**Workspace is pure editing:**
- Groups displayed
- Drag-drop students
- Undo/redo
- "Show to Class" button (goes to present mode)

### Flow 4: Presenting to Class
```
Workspace → "Show to Class" → Present mode → "Done" → Back to Workspace
```

**Present mode is:**
- Full-screen clean view
- Student search
- All groups visible
- No editing controls
- "Done presenting" returns to workspace

---

## Part 4: Component Simplification

### Activity Hub (`/activities/[id]`)
Smart redirect based on state:
- No groups yet → Redirect to `/activities/[id]/setup`
- Has groups → Redirect to `/activities/[id]/workspace`

Alternatively: Minimal page showing status with buttons to Setup/Workspace/Present.

### Setup Page (`/activities/[id]/setup`)
Single page combining:
- Roster management (view/edit students)
- Group configuration (templates inline)
- Preference import (optional, collapsible)
- Algorithm settings (hidden by default)

**One primary action:** "Generate Groups" → Goes to workspace

### Workspace Page (`/activities/[id]/workspace`)
Pure editing interface:
- Header: Activity name + "Show to Class" button
- Toolbar: Undo | Redo | Regenerate (dropdown with options)
- Main: Groups with drag-drop
- No: Analytics panel, history selector, export menus

**Analytics:** Shown inline as small summary, not expandable panel
**Export:** In "..." menu, not prominent
**Sessions:** Move to Setup page (publishing history)

### Present Page (`/activities/[id]/present`)
Clean presentation:
- Activity name header
- Two tabs: "Find My Group" (search) | "All Groups"
- "Done Presenting" button → back to workspace

---

## Part 5: Implementation Plan

### Phase 1: Route Restructure (Foundation)
**Goal:** New URL structure working with redirects

**Tasks:**
1. Create `/activities` route (redirect from `/groups`)
2. Create `/activities/new` route (redirect from `/groups/new`)
3. Create `/activities/[id]` hub page
4. Create `/activities/[id]/setup` page (stub)
5. Create `/activities/[id]/workspace` page (move current editing)
6. Create `/activities/[id]/present` page (move current student view)
7. Add redirects from old routes to new

**Files created:**
- `src/routes/activities/+page.svelte`
- `src/routes/activities/new/+page.svelte`
- `src/routes/activities/[id]/+page.svelte`
- `src/routes/activities/[id]/setup/+page.svelte`
- `src/routes/activities/[id]/workspace/+page.svelte`
- `src/routes/activities/[id]/present/+page.svelte`

### Phase 2: Wizard Simplification
**Goal:** 3-step wizard that gets teachers to groups fast

**Tasks:**
1. Redesign StepStudents (keep paste, simplify sheet)
2. Create new StepGroups (merge groups + preferences)
3. Remove StepName (auto-generate)
4. Remove StepSelectRoster (inline choice)
5. Remove StepPreferences (merge into groups)
6. Auto-run algorithm at end → go straight to workspace

**Files modified:**
- `src/routes/activities/new/+page.svelte`
- `src/lib/components/wizard/StepStudents.svelte`
- Create: `src/lib/components/wizard/StepGroupsSimple.svelte`

**Files removed:**
- `src/lib/components/wizard/StepName.svelte`
- `src/lib/components/wizard/StepSelectRoster.svelte`
- `src/lib/components/wizard/StepPreferences.svelte`
- `src/lib/components/wizard/StepGroupsUnified.svelte`
- `src/lib/components/wizard/StepGroupsFork.svelte`

### Phase 3: Workspace Cleanup
**Goal:** Pure editing interface without clutter

**Tasks:**
1. Remove header action buttons (View candidates, Sessions, Students)
2. Simplify EditingToolbar (Undo, Redo, Regenerate dropdown, Show to Class)
3. Remove analytics panel (show metrics inline)
4. Remove history selector (regenerate gives options inline)
5. Remove layout toggle (pick one good default)
6. Move export to "..." menu

**Files modified:**
- `src/routes/activities/[id]/workspace/+page.svelte`
- `src/lib/components/editing/EditingToolbar.svelte`

**Files removed:**
- `src/lib/components/editing/AnalyticsPanel.svelte`
- `src/lib/components/editing/HistorySelector.svelte`

### Phase 4: Setup Page Creation
**Goal:** Single place for all configuration

**Tasks:**
1. Create setup page with sections:
   - Roster (view students, import more)
   - Groups (configure groups, use templates)
   - Preferences (optional import)
   - History (published sessions)
2. Templates management inline (no separate route)
3. Algorithm options (collapsible, advanced)

**Files created:**
- `src/routes/activities/[id]/setup/+page.svelte`
- `src/lib/components/setup/RosterSection.svelte`
- `src/lib/components/setup/GroupsSection.svelte`
- `src/lib/components/setup/PreferencesSection.svelte`
- `src/lib/components/setup/HistorySection.svelte`

**Files removed:**
- `src/routes/groups/templates/+page.svelte`
- `src/routes/groups/[id]/sessions/+page.svelte`

### Phase 5: Cleanup
**Goal:** Remove unused code, update all references

**Tasks:**
1. Remove old routes completely
2. Remove `/algorithms` route (optional: move to help docs)
3. Remove unused components
4. Update all internal links
5. Update docs (PRODUCT.md, STATUS.md, etc.)

---

## Part 6: UI Mockups (Text)

### Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Groupwheel                              [Login/User] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Your Activities                          [+ New Activity]  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Spring Clubs    │  │ Science Teams   │                   │
│  │ 32 students     │  │ 24 students     │                   │
│  │ ● Published     │  │ ○ Editing       │                   │
│  │                 │  │                 │                   │
│  │ [Edit Groups]   │  │ [Edit Groups]   │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Wizard (3 steps)
```
┌─────────────────────────────────────────────────────────────┐
│ Create Activity                                   [Cancel]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1 of 3: Students                                      │
│  ━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░              │
│                                                             │
│  Paste your student list below                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Name          Grade                             │        │
│  │ Alice Smith   5                                 │        │
│  │ Bob Jones     5                                 │        │
│  │ ...                                             │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  32 students detected                                       │
│                                                             │
│                                          [Continue →]       │
└─────────────────────────────────────────────────────────────┘
```

### Workspace
```
┌─────────────────────────────────────────────────────────────┐
│ ← Activities    Spring Clubs                [Show to Class] │
├─────────────────────────────────────────────────────────────┤
│ [Undo] [Redo]  72% got top choice  [↻ Regenerate ▾]  [...]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Art      │  │ Drama    │  │ Music    │  │ Sports   │     │
│  │ (8)      │  │ (7)      │  │ (9)      │  │ (8)      │     │
│  │          │  │          │  │          │  │          │     │
│  │ Alice    │  │ David    │  │ Grace    │  │ Leo      │     │
│  │ Bob      │  │ Emma     │  │ Henry    │  │ Mike     │     │
│  │ Carol    │  │ Frank    │  │ Ivy      │  │ Nina     │     │
│  │ ...      │  │ ...      │  │ ...      │  │ ...      │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  Drag students between groups • Changes save automatically  │
└─────────────────────────────────────────────────────────────┘
```

### Present Mode
```
┌─────────────────────────────────────────────────────────────┐
│ Spring Clubs                              [Done Presenting] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Find My Group]  [All Groups]                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type your name to find your group...                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Alice Smith                               Art      │    │
│  │  Grade 5                                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 7: Success Criteria

### Quantitative
- Routes reduced from 14 to 9
- Wizard steps reduced from 4-5 to 3
- Header actions reduced from 7 to 3
- Toolbar controls reduced from 8+ to 4

### Qualitative
- Teacher can create first activity in < 5 minutes
- No "what do I do next?" moments
- Primary actions are obvious at every step
- Power features exist but don't clutter main flow

---

## Part 8: Questions Resolved

1. **User research**: Teachers have no patience → Everything must be obvious
2. **Timeline**: Deeper restructuring approved
3. **Candidate gallery**: Becomes optional power feature (inline in workspace)
4. **Backward compatibility**: Can remove routes (no redirects needed for old bookmarks)

---

## Ready for Approval

This plan restructures Groupwheel around teacher tasks rather than app features. The implementation is in 5 phases, starting with route structure and ending with cleanup.

**Estimated effort:** 3-4 weeks for full implementation

**Risk mitigation:** Each phase delivers working software; can pause and ship at any phase boundary.

---

# Phase 3 Implementation Plan: Workspace

## Overview

Phase 3 focuses on creating a clean group editing interface with drag-drop, undo/redo, and a clear path to presenting. This plan compares the Phase 3 requirements (from `IMPLEMENTATION_PLAN_FOR_UX_OVERHAUL.md`) against what's already implemented and identifies remaining work.

---

## Step 1: Research Findings

### What Already Exists

**The workspace is substantially implemented.** Key findings:

| User Story | Requirement | Current Status | Gap? |
|------------|-------------|----------------|------|
| **US-3.1: Layout** | Header with back link, name, "Show to Class" button | ✅ Implemented (`workspace/+page.svelte:594-669`) | Minor: Header shows "Edit Groups" not activity name; no editable name in header |
| **US-3.1: Layout** | Toolbar with Undo, Redo, Analytics, Regenerate | ✅ Implemented (`EditingToolbar.svelte`) | No |
| **US-3.1: Layout** | Footer hint about drag/auto-save | ✅ Implemented (`workspace/+page.svelte:824-827`) | No |
| **US-3.1: Layout** | Responsive group grid | ✅ Implemented (`GroupEditingLayout.svelte`) | No |
| **US-3.2: Drag and Drop** | Students draggable between groups | ✅ Implemented (`pragmatic-dnd.ts`, `DraggableStudentCard.svelte`) | No |
| **US-3.2: Drag and Drop** | Visual feedback on drag | ✅ Implemented with drop zones, flash effects | No |
| **US-3.2: Drag and Drop** | Auto-save with debounce | ✅ Implemented (`scenarioEditingStore.ts`) | No |
| **US-3.2: Drag and Drop** | Touch support | ⚠️ Pragmatic DnD has touch support, needs testing | Test only |
| **US-3.3: Undo/Redo** | Undo/redo buttons + keyboard | ✅ Buttons implemented | **Missing: Keyboard shortcuts** |
| **US-3.3: Undo/Redo** | History persistence during session | ✅ In-memory command stack | No |
| **US-3.4: Regenerate** | "Shuffle again" | ✅ "Try Another" button | No |
| **US-3.4: Regenerate** | "Start fresh" | ✅ "Start Over" button with confirmation | No |
| **US-3.5: Analytics** | Inline summary in toolbar | ✅ `metricSummary` shows "X% top choice" | No |
| **US-3.5: Analytics** | Expandable detail panel | ✅ `AnalyticsPanel.svelte` with breakdown | No |
| **US-3.6: Student Info** | Hover tooltip with preferences | ⚠️ Partially - cards show name only | **Yes: Add preference tooltip** |
| **US-3.6: Student Info** | Indicator for got-top-choice | ⚠️ Partially in EditableGroupColumn | **Yes: Visible ★ on card** |
| **US-3.7: Overflow Menu** | Export CSV/TSV/Print | ✅ Export dropdown implemented | **Missing: Print view, Go to Setup** |
| **US-3.8: Show to Class** | Button navigates to Present | ✅ Button exists | **Missing: Publish prompt** |

### Key Files Identified

**Routes:**
- `src/routes/activities/[id]/workspace/+page.svelte` (891 lines) - main workspace
- `src/routes/activities/[id]/present/+page.svelte` - present mode (exists, needs verification)

**Components:**
- `src/lib/components/editing/EditingToolbar.svelte` - toolbar
- `src/lib/components/editing/GroupEditingLayout.svelte` - group grid
- `src/lib/components/editing/EditableGroupColumn.svelte` - individual group card
- `src/lib/components/editing/DraggableStudentCard.svelte` - student card
- `src/lib/components/editing/AnalyticsPanel.svelte` - analytics panel
- `src/lib/components/editing/UnassignedArea.svelte` - unassigned students
- `src/lib/components/editing/PublishSessionModal.svelte` - publish modal

**Stores:**
- `src/lib/stores/scenarioEditingStore.ts` - command-based editing state

**Domain:**
- `src/lib/domain/session.ts` - Session type with DRAFT/PUBLISHED/ARCHIVED status
- `src/lib/domain/scenario.ts` - Scenario type

### Test Coverage

Only one E2E test exists: `e2e/demo.test.ts`. No unit tests for workspace components.

---

## Step 2: Architecture Verification

### Layers Touched

| Layer | Changes Needed |
|-------|---------------|
| **Domain** | None - Session/Scenario status already supports DRAFT/PUBLISHED |
| **Application** | Possibly extend publish use case for prompt workflow |
| **Infrastructure** | None |
| **UI** | Most changes here - components and workspace page |

### Architectural Concerns

1. **Keyboard shortcuts for undo/redo**: Should be added in workspace page, not store (UI concern)
2. **Publish prompt workflow**: Currently workspace has PublishSessionModal - may need adjustment to show prompt when clicking "Show to Class" vs explicit Publish button
3. **Student tooltip with preferences**: UI component change only

### Anti-patterns to Avoid

- ❌ Don't add business logic to components
- ❌ Don't bypass the scenarioEditingStore for state changes
- ✅ Use existing preferenceMap for tooltip data

---

## Step 3: Approaches

Given the workspace is substantially implemented, the work is about **filling gaps** rather than rebuilding.

### Approach A: Minimal Gap Fill (Recommended)

**What it does:** Address only the explicit gaps from Phase 3 user stories, doing the minimum required.

**Files to modify:**
1. `src/routes/activities/[id]/workspace/+page.svelte`
   - Add keyboard shortcuts for Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo)
   - Add editable activity name in header
2. `src/lib/components/editing/DraggableStudentCard.svelte`
   - Add preference tooltip on hover
   - Add ★ indicator for students who got their top choice
3. Modify export menu
   - Add "Print View" and "Go to Setup" options
4. Modify "Show to Class" button
   - Add publish prompt before navigation

**Trade-offs:**
- Implementation effort: **Quick win** - mostly adding small features
- Best-practice alignment: **Canonical** - follows existing patterns
- Maintenance burden: **Simple** - minimal new code

---

### Approach B: Full Phase 3 Compliance with Enhancements

**What it does:** Implements everything in Phase 3 spec exactly, plus adds polish items from the spec's edge cases.

**Files to modify:**
1. All files from Approach A, plus:
2. `src/lib/components/editing/StudentInfoTooltip.svelte` (new)
3. Refactor header to `WorkspaceHeader.svelte` (new)
4. Add print stylesheet or print route

**Trade-offs:**
- Implementation effort: **Moderate** - more refactoring
- Best-practice alignment: **Canonical** - good component separation
- Maintenance burden: **Manageable** - cleaner separation but more files

---

### Approach C: Refactor + Fill Gaps

**What it does:** Refactors the 891-line workspace page into smaller, focused components while filling gaps.

**Files to modify/create:**
1. Slim down `workspace/+page.svelte` to orchestration only
2. New components: `WorkspaceHeader.svelte`, `WorkspaceContent.svelte`, `PublishPrompt.svelte`, `StudentInfoTooltip.svelte`

**Trade-offs:**
- Implementation effort: **Significant** - major refactoring
- Best-practice alignment: **Canonical** - improves architecture
- Maintenance burden: **Simple long-term** - but upfront cost

---

## Step 4: Recommendation

**Chosen: Approach C (Refactor + Fill Gaps)**

### Reasons:

1. **Most canonical architecture.** Breaking the 891-line workspace into focused components improves maintainability.

2. **Easier future work.** Smaller components are easier to modify, test, and reason about.

3. **User requested.** Stakeholder prefers upfront investment for cleaner architecture.

### Design Decisions:

1. **Publish prompt behavior:** Keep both - Publish button in toolbar + prompt on "Show to Class"
2. **Student tooltip:** Desktop hover only (300ms delay)
3. **Print view:** Dedicated print route at `/activities/[id]/print`

---

## Step 5: Implementation Tasks (Approach C)

### Task 1: Extract WorkspaceHeader Component
**New file:** `src/lib/components/workspace/WorkspaceHeader.svelte`
**Work:**
- Extract header from workspace page
- Include: back link, editable activity name, export menu, "Show to Class" button
- Props: programId, programName, onNameChange, isPublished, onShowToClass

### Task 2: Create Editable Activity Name
**File:** `src/lib/components/workspace/WorkspaceHeader.svelte`
**Work:**
- Click-to-edit inline text for activity name
- Blur/Enter to save, Escape to cancel
- Wire to updateProgram use case
- Create `updateProgram` use case if it doesn't exist

### Task 3: Extract WorkspaceContent Component
**New file:** `src/lib/components/workspace/WorkspaceContent.svelte`
**Work:**
- Extract main content area (toolbar, analytics, groups, footer)
- Manages editing state presentation
- Props: view, students, preferences, handlers for all editing operations

### Task 4: Create StudentInfoTooltip Component
**New file:** `src/lib/components/editing/StudentInfoTooltip.svelte`
**Work:**
- Desktop hover only (300ms delay)
- Show: full name, preferences list ("Requested: Art (1st), Drama (2nd)")
- Show: satisfaction status ("✓ Got 1st choice" or "Got 3rd choice")
- Position intelligently near mouse

### Task 5: Add Top-Choice Indicator to Student Cards
**File:** `src/lib/components/editing/DraggableStudentCard.svelte`
**Work:**
- Accept preferenceRank prop (1, 2, 3, or null)
- Show ★ indicator when student got top choice (rank === 1)
- Wire tooltip to card hover

### Task 6: Create ShowToClassPrompt Component
**New file:** `src/lib/components/workspace/ShowToClassPrompt.svelte`
**Work:**
- Modal prompt when clicking "Show to Class" (if not published)
- Options: "Publish & Present" / "Just Preview"
- If already published, navigate directly

### Task 7: Add Keyboard Shortcuts for Undo/Redo
**File:** `src/routes/activities/[id]/workspace/+page.svelte`
**Work:**
- Add keydown listener for Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo)
- Clean up listener on destroy

### Task 8: Improve Export Menu
**File:** `src/lib/components/workspace/WorkspaceHeader.svelte`
**Work:**
- Add "Print View" → navigate to `/activities/[id]/print`
- Add "Go to Setup" → navigate to `/activities/[id]/setup`

### Task 9: Create Print Route
**New file:** `src/routes/activities/[id]/print/+page.svelte`
**Work:**
- Dedicated print-optimized page
- Clean layout suitable for printing
- Auto-trigger print dialog or provide print button
- "Back to Workspace" link

### Task 10: Refactor Workspace Page
**File:** `src/routes/activities/[id]/workspace/+page.svelte`
**Work:**
- Slim down to orchestration only
- Use new WorkspaceHeader, WorkspaceContent components
- Wire up all handlers and state
- Handle keyboard shortcuts at page level

### Task 11: Handle Edge Cases
**Various files**
**Work:**
- Drop outside group: student returns to original position
- Rapid drags: changes queued correctly
- Touch support: verify pragmatic-dnd works
- Save errors: clear error messages with retry
- Empty groups: handled gracefully

### Task 12: Test Gate Verification
**Work:**
- Manual testing of all TEST GATE 4 items
- Verify all edge cases from US-3.x specs

---

## Files Summary

### New Files:
1. `src/lib/components/workspace/WorkspaceHeader.svelte` - header with editable name, export menu
2. `src/lib/components/workspace/WorkspaceContent.svelte` - main content orchestration
3. `src/lib/components/workspace/ShowToClassPrompt.svelte` - publish/preview prompt
4. `src/lib/components/editing/StudentInfoTooltip.svelte` - preference tooltip
5. `src/routes/activities/[id]/print/+page.svelte` - print view
6. `src/lib/application/useCases/updateProgram.ts` - (if doesn't exist)

### Modified Files:
1. `src/routes/activities/[id]/workspace/+page.svelte` - slimmed down orchestration
2. `src/lib/components/editing/DraggableStudentCard.svelte` - tooltip + top-choice indicator
3. `src/lib/components/editing/EditableGroupColumn.svelte` - pass preference data to cards

---

## Implementation Status

**Approved.** Proceeding with Approach C implementation.
