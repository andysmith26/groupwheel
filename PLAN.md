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

---

# Phase 4 Implementation Plan: Setup Page

## Overview

Phase 4 focuses on creating a single configuration page with progressive disclosure for advanced features. The goal is a unified place to manage roster, groups, preferences, and history.

---

## Step 1: Research Findings

### What Already Exists

**Route Structure:**
- `/activities/[id]/setup/+page.svelte` exists as a **stub** with disabled buttons and placeholder sections (lines 141-215)
- The page loads activity data via `getActivityData()` use case but doesn't use sessions/preferences
- "Generate Groups" button redirects to old `/groups/[id]/candidates` route (line 77)
- History section links to old `/groups/[id]/sessions` route (line 209)

**Domain Entities (all fully defined):**
- `Program` - activity container (`src/lib/domain/program.ts`)
- `Pool` - roster of students (`src/lib/domain/pool.ts`)
- `Student` - individual student (`src/lib/domain/student.ts`)
- `Group` - group with members/capacity (`src/lib/domain/group.ts`)
- `GroupTemplate` - reusable group definitions (`src/lib/domain/groupTemplate.ts`)
- `Preference` / `StudentPreference` - group preferences (`src/lib/domain/preference.ts`)
- `Session` - time-bounded activity instance with DRAFT/PUBLISHED/ARCHIVED status (`src/lib/domain/session.ts`)
- `Placement` - historical student placement records (`src/lib/domain/placement.ts`)

**Use Cases (all exist):**
- `getActivityData` - loads program, pool, students, preferences, scenario, sessions
- `generateScenario` / `generateCandidate` - group generation
- `listGroupTemplates` / `createGroupTemplate` / `deleteGroupTemplate` - template CRUD
- `listSessions` / `publishSession` - session management
- `getStudentPlacementHistory` - placement history lookup

**Existing Components (reusable/adaptable):**
- `StepPreferences.svelte` - preference import from CSV/Sheets (669 lines, full implementation)
- `SessionCard.svelte` - session display card (52 lines)
- Templates page at `/groups/templates/+page.svelte` - full template CRUD UI (443 lines)
- `TabSelector.svelte`, `SheetConnector.svelte` - Google Sheets integration

**Tests:**
- Only e2e test exists: `e2e/demo.test.ts`
- No unit tests for setup page or related use cases

---

## Step 2: Architecture Verification

### Layers Touched

| Layer | Changes Needed |
|-------|---------------|
| **Domain** | None - all entities exist |
| **Application** | New use cases: `addStudentToPool`, `removeStudentFromPool` |
| **Infrastructure** | None |
| **UI** | Most changes here - new setup section components |

### Architectural Concerns

Per `docs/ARCHITECTURE.md`:

1. **Required pattern:** Routes must use `getAppEnvContext()` + facade helpers from `appEnvUseCases.ts`
2. **Anti-patterns to avoid:**
   - No direct repository access from components (use facade)
   - No business logic in Svelte components (use use cases)
   - No infrastructure imports in routes

**Assessment:** Phase 4 primarily modifies UI layer. Existing use cases should suffice for most operations. Need new use cases for student add/remove operations.

---

## Step 3: Gap Analysis

### What's Already Working

| Feature | Requirement | Current Status |
|---------|-------------|----------------|
| Load activity data | US-4.1 | ✅ `getActivityData()` loads everything |
| Template CRUD | US-4.4 | ✅ Use cases exist, UI at `/groups/templates` |
| Preference import | US-4.5 | ✅ `StepPreferences.svelte` is complete |
| Session display | US-4.6 | ✅ `SessionCard.svelte` exists |
| Group generation | US-4.7 | ✅ `generateScenario()` use case exists |

### What Needs Implementation

| Feature | Requirement | Status | Gap |
|---------|-------------|--------|-----|
| Collapsible sections | US-4.1 | ❌ Stub only | **Create section UI pattern** |
| Activity name editing | US-4.1 | ❌ Not editable | **Add inline edit** |
| Student list/search | US-4.2 | ❌ Shows count only | **Build roster section** |
| Add student | US-4.2 | ❌ Not implemented | **New use case + UI** |
| Remove student | US-4.2 | ❌ Not implemented | **New use case + UI** |
| Group editing | US-4.3 | ❌ Not implemented | **Build groups section** |
| Template picker modal | US-4.4 | ❌ Not in setup | **Extract from templates page** |
| Save as template | US-4.4 | ❌ Not in setup | **Create modal** |
| Preferences in setup | US-4.5 | ❌ Disabled button | **Wrap StepPreferences** |
| History section | US-4.6 | ❌ Links to old route | **Build inline history** |
| Generate button | US-4.7 | ❌ Redirects to old route | **Call use case directly** |

---

## Step 4: Approaches

### Approach A: Component Composition (Recommended)

**What it does:** Extract reusable section components from the existing stub page, adapting existing wizard components where possible.

**Files created/modified:**
```
Modified:
  src/routes/activities/[id]/setup/+page.svelte        # Main page orchestration

New components:
  src/lib/components/setup/SetupStudentsSection.svelte  # US-4.2
  src/lib/components/setup/SetupGroupsSection.svelte    # US-4.3, US-4.4
  src/lib/components/setup/SetupPrefsSection.svelte     # US-4.5 (wraps StepPreferences)
  src/lib/components/setup/SetupHistorySection.svelte   # US-4.6
  src/lib/components/setup/TemplatePickerModal.svelte   # US-4.4
  src/lib/components/setup/SaveTemplateModal.svelte     # US-4.4
  src/lib/components/setup/CollapsibleSection.svelte    # Reusable UI pattern

New use cases:
  src/lib/application/useCases/addStudentToPool.ts
  src/lib/application/useCases/removeStudentFromPool.ts
```

**Trade-offs:**
- Implementation effort: **Moderate** - reuses existing components
- Best-practice alignment: **Canonical** - follows hexagonal architecture
- Maintenance burden: **Simple** - clear separation of concerns

---

### Approach B: Monolithic Page

**What it does:** Implement all sections directly in the setup page without extracting components.

**Files created/modified:**
```
Modified:
  src/routes/activities/[id]/setup/+page.svelte  # Everything in one file (~600-800 lines)
```

**Trade-offs:**
- Implementation effort: **Quick win** - fastest to implement
- Best-practice alignment: **Technical debt** - violates component reuse principles
- Maintenance burden: **Complex** - large single file, hard to test

---

### Approach C: Full Feature Components

**What it does:** Build feature-complete components with their own state management that could work standalone.

**Files created/modified:**
```
New components:
  src/lib/components/features/RosterManager.svelte      # Full roster CRUD
  src/lib/components/features/GroupConfigurator.svelte  # Full group config
  src/lib/components/features/PreferenceImporter.svelte # Full pref import
  src/lib/components/features/SessionHistory.svelte     # Full history view
  src/lib/components/features/TemplateManager.svelte    # Full template CRUD

Modified:
  src/routes/activities/[id]/setup/+page.svelte  # Thin orchestrator
```

**Trade-offs:**
- Implementation effort: **Significant** - more abstraction
- Best-practice alignment: **Canonical** - maximum reuse potential
- Maintenance burden: **Manageable** - components are testable units

---

## Step 5: Recommendation

**Chosen: Approach A (Component Composition)**

### Reasons:

1. **Balances reuse with pragmatism.** We already have working implementations in `StepPreferences.svelte` and the templates page that can be adapted, not rewritten from scratch.

2. **Follows existing patterns.** The codebase uses section-based components elsewhere (editing components, wizard steps).

**What would flip the choice:**
- If we planned to reuse these sections elsewhere (e.g., a separate roster management page), Approach C would be better.
- If Phase 4 were blocked and we needed it urgently, Approach B would unblock faster.

---

## Step 6: Implementation Tasks (Approach A)

### Task 1: Create CollapsibleSection Component
**New file:** `src/lib/components/setup/CollapsibleSection.svelte`
**Work:**
- Reusable expand/collapse pattern
- Props: title, summary (e.g., "32 students"), helpText, isExpanded, isPrimary
- Slot for section content
- Chevron icon animation

### Task 2: Create SetupStudentsSection Component
**New file:** `src/lib/components/setup/SetupStudentsSection.svelte`
**Work:**
- Collapsed: shows count + first few names
- Expanded: scrollable list of students
- Search/filter input (if >20 students)
- Delete (x) button per student with confirmation
- "Add student" inline form
- "Import more" button → opens import modal
- Needs new props: students, onAddStudent, onRemoveStudent, onImportMore

### Task 3: Create Add/Remove Student Use Cases
**New files:**
- `src/lib/application/useCases/addStudentToPool.ts`
- `src/lib/application/useCases/removeStudentFromPool.ts`
**Work:**
- `addStudentToPool(deps, { poolId, firstName, lastName, email? })` → creates student, adds to pool
- `removeStudentFromPool(deps, { poolId, studentId })` → removes from pool, optionally deletes student
- Add facade helpers in `appEnvUseCases.ts`

### Task 4: Create SetupGroupsSection Component
**New file:** `src/lib/components/setup/SetupGroupsSection.svelte`
**Work:**
- Collapsed: shows group names + count
- Expanded: editable list with name/capacity inputs
- Add/remove groups
- Drag handles for reorder (optional, could defer)
- "Use template" button → opens TemplatePickerModal
- "Save as template" button → opens SaveTemplateModal
- Note: "Changes to groups require regenerating"
- Props: groups, onGroupsChange, templates

### Task 5: Create TemplatePickerModal Component
**New file:** `src/lib/components/setup/TemplatePickerModal.svelte`
**Work:**
- Modal with list of templates (uses `listGroupTemplates()`)
- Each template shows: name, group count, group names preview
- "Use" button → confirmation → applies template groups to current config
- Props: isOpen, onClose, onSelectTemplate, templates

### Task 6: Create SaveTemplateModal Component
**New file:** `src/lib/components/setup/SaveTemplateModal.svelte`
**Work:**
- Modal with name input (default: "{N} Groups Template")
- Description input (optional)
- "Save" calls `createGroupTemplate()` use case
- Props: isOpen, onClose, groups

### Task 7: Create SetupPrefsSection Component
**New file:** `src/lib/components/setup/SetupPrefsSection.svelte`
**Work:**
- Thin wrapper around `StepPreferences.svelte`
- Section marked "(Optional)"
- Shows summary when preferences exist: "24 of 32 students have preferences"
- "Clear all preferences" button with confirmation
- Props: students, groupNames, preferences, onPreferencesChange, sheetConnection

### Task 8: Create SetupHistorySection Component
**New file:** `src/lib/components/setup/SetupHistorySection.svelte`
**Work:**
- Load sessions from activity data (already fetched)
- Display reverse-chronological list using `SessionCard.svelte`
- Click to expand → show read-only arrangement
- Expanded view: groups with student lists (not editable)
- Empty state: "No history yet. Groups appear here after publishing."
- Props: sessions, groups (for expanded view)

### Task 9: Update Setup Page
**File:** `src/routes/activities/[id]/setup/+page.svelte`
**Work:**
- Add editable activity name in header (click-to-edit pattern)
- Replace stub sections with new components
- Wire up all handlers and state
- Implement "Generate Groups" / "Regenerate Groups" button:
  - Call `generateScenario()` use case with current config + preferences
  - Show confirmation if replacing existing groups
  - Navigate to `/activities/[id]/workspace` on success
- Loading/error states

### Task 10: Handle Edge Cases
**Various files**
**Work:**
- Remove student assigned to group: Also removes from group, shows warning
- Add student: Added to "Unassigned" pool or prompted to assign
- Duplicate student name on add: Allow with visual note
- Search no results: "No students match 'xyz'"
- Delete group with students: Show modal "Move X students to:" with group picker
- Delete all groups: Show "Add at least one group to generate"

### Task 11: Test Gate Verification
**Work:**
- Manual testing of all TEST GATE 5 items from IMPLEMENTATION_PLAN_FOR_UX_OVERHAUL.md

---

## Files Summary

### New Files (Use Cases):
1. `src/lib/application/useCases/addStudentToPool.ts`
2. `src/lib/application/useCases/removeStudentFromPool.ts`

### New Files (Components):
1. `src/lib/components/setup/CollapsibleSection.svelte` - reusable UI pattern
2. `src/lib/components/setup/SetupStudentsSection.svelte` - roster management
3. `src/lib/components/setup/SetupGroupsSection.svelte` - group configuration
4. `src/lib/components/setup/SetupPrefsSection.svelte` - preferences wrapper
5. `src/lib/components/setup/SetupHistorySection.svelte` - history view
6. `src/lib/components/setup/TemplatePickerModal.svelte` - template selection
7. `src/lib/components/setup/SaveTemplateModal.svelte` - save template

### Modified Files:
1. `src/routes/activities/[id]/setup/+page.svelte` - main orchestration
2. `src/lib/services/appEnvUseCases.ts` - add new use case wrappers

---

## Test Gate Checklist (from IMPLEMENTATION_PLAN_FOR_UX_OVERHAUL.md)

1. [ ] Navigate to Setup from Hub or Workspace menu
2. [ ] Four sections visible with clear labels
3. [ ] Expand Students → See full roster, search works
4. [ ] Add student → Student appears in list
5. [ ] Remove student → Confirmation → Student removed
6. [ ] Expand Groups → Edit group names works
7. [ ] Add/remove group → List updates
8. [ ] Save as template → Template appears in "Use template"
9. [ ] Use template → Confirmation → Groups replaced
10. [ ] Import preferences via CSV paste → Preview shows parsed data
11. [ ] Preferences validation shows warnings for mismatches
12. [ ] "Generate Groups" → Confirm → Navigate to Workspace
13. [ ] Publish groups, return to Setup → History shows session
14. [ ] Click history entry → See read-only view of that arrangement
15. [ ] Mobile: Sections expand/collapse properly, forms usable

---

## Dependencies & Prerequisites

- [x] `getActivityData()` already loads sessions, preferences, students
- [x] `listGroupTemplates()` / `createGroupTemplate()` exist
- [x] `StepPreferences.svelte` exists and handles CSV/Sheets import
- [x] `SessionCard.svelte` exists for session display
- [ ] Need use cases for add/remove student from pool
- [ ] Need to verify `generateScenario()` handles preferences correctly

---

## Risks & Mitigations

1. **Risk:** `StepPreferences.svelte` tightly coupled to wizard context
   - **Mitigation:** Create thin wrapper that provides required props/callbacks

2. **Risk:** Student add/remove affects scenario consistency
   - **Mitigation:** Mark scenario as needing regeneration when roster changes

3. **Risk:** Template data model may need extension (e.g., user ownership)
   - **Mitigation:** `GroupTemplate` already has `ownerStaffId` and `userId` fields

---

## Implementation Status

**Awaiting approval.** Please review this plan and confirm:
1. Approach A (Component Composition) is acceptable
2. We should create add/remove student use cases
3. Any changes to the proposed component structure

---

# Phase 5 Implementation Plan: Present Mode (US-5.2 & US-5.3)

## Overview

Phase 5 enhances the presentation view with an improved student search experience (US-5.2) and a polished all-groups display (US-5.3). The existing implementation provides a solid foundation that needs targeted improvements.

---

## Step 1: Research Findings

### What Already Exists

**File:** `src/routes/activities/[id]/present/+page.svelte` (247 lines)

| Feature | Requirement | Current Status | Gap? |
|---------|-------------|----------------|------|
| **US-5.2: Search Input** | Large, auto-focused | ✅ Large (text-2xl, py-5) | **Missing: auto-focus** |
| **US-5.2: As-you-type** | No submit button | ✅ Implemented via `bind:value` | No |
| **US-5.2: Matching** | Case-insensitive, partial from start | ⚠️ Uses `.includes()` not `.startsWith()` | **Change to startsWith** |
| **US-5.2: Single match** | Large card "Alice → Art Club" | ✅ Shows name and group badge | No |
| **US-5.2: Multiple matches** | List with group names | ✅ Shows list | No |
| **US-5.2: No match** | "No student found. Check your spelling?" | ⚠️ Shows generic message | **Update text** |
| **US-5.2: Result emphasis** | Group name prominent | ✅ Styled with bg-teal badge | No |
| **US-5.2: Show other members** | Optional | ❌ Not implemented | **Add (optional)** |
| **US-5.2: Debounce** | 150ms for fast typing | ❌ No debounce | **Add debounce** |
| **US-5.3: Grid** | Grid of group cards | ✅ 3-column responsive | No |
| **US-5.3: Card content** | Group name large, student list | ✅ Implemented | No |
| **US-5.3: Projection sizing** | Large enough for back of room | ✅ text-2xl for group names, text-lg for students | No |
| **US-5.3: Responsive** | 4 → 2 → 1 columns | ⚠️ Currently lg:3 md:2 | **Verify/adjust** |
| **US-5.3: Visual distinction** | Colors/icons for groups | ❌ All groups same teal color | **Add color variety** |

### Key Code Patterns

**Current search filtering (lines 49-59):**
```typescript
let filteredAssignments = $derived.by(() => {
  if (!searchQuery.trim()) return [];
  const query = searchQuery.toLowerCase().trim();
  return assignments.filter(
    (a) =>
      a.studentName.toLowerCase().includes(query) ||
      a.studentId.toLowerCase().includes(query) ||
      a.firstName.toLowerCase().includes(query) ||
      a.lastName.toLowerCase().includes(query)
  );
});
```

**Current group display (lines 61-70):**
```typescript
let groupedAssignments = $derived.by(() => {
  const groups = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    if (!groups.has(assignment.groupName)) {
      groups.set(assignment.groupName, []);
    }
    groups.get(assignment.groupName)!.push(assignment);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
});
```

### Domain Types Used

- `ExportableAssignment` from `csvExport.ts` (lines 14-22):
  ```typescript
  interface ExportableAssignment {
    studentId: string;
    studentName: string;
    firstName: string;
    lastName: string;
    grade?: string;
    groupName: string;
    groupId: string;
  }
  ```

### Existing Debounce Pattern

Found in `scenarioEditingStore.ts`:
```typescript
private readonly debounceMs: number = 500;
// Used with setTimeout/clearTimeout pattern
```

The codebase uses manual setTimeout debouncing, not a utility function. For a simple 150ms search debounce, a local implementation is appropriate.

---

## Step 2: Architecture Verification

### Layers Touched

| Layer | Changes Needed |
|-------|---------------|
| **Domain** | None - existing types sufficient |
| **Application** | None - no new use cases needed |
| **Infrastructure** | None |
| **UI** | Present page modifications only |

### Architectural Assessment

This is a **pure UI enhancement**. All changes are confined to `src/routes/activities/[id]/present/+page.svelte`. The data loading (via `getStudentActivityView` use case) remains unchanged.

**Anti-patterns avoided:**
- ✅ No business logic added to component (filtering is pure display logic)
- ✅ No repository access (uses facade helper)
- ✅ No infrastructure imports

---

## Step 3: Approaches

### Approach A: In-Place Enhancement (Recommended)

**What it does:** Modify the existing present page file directly to add all improvements.

**Files modified:**
```
src/routes/activities/[id]/present/+page.svelte
```

**Changes:**
1. Add auto-focus to search input when "Find My Group" tab selected
2. Change matching from `.includes()` to `.startsWith()` on firstName
3. Add 150ms debounce to search
4. Update "no match" message
5. Add optional "Other members" section in search results
6. Add group color assignment (cycle through preset palette)
7. Verify/adjust responsive breakpoints

**Trade-offs:**
- Implementation effort: **Quick win** - all changes in one file
- Best-practice alignment: **Canonical** - keeps presentation logic together
- Maintenance burden: **Simple** - no new files/abstractions

---

### Approach B: Component Extraction

**What it does:** Extract search and results display into separate components.

**Files created:**
```
src/lib/components/present/StudentSearch.svelte
src/lib/components/present/SearchResults.svelte
src/lib/components/present/GroupCard.svelte
```

**Trade-offs:**
- Implementation effort: **Moderate** - more files to create
- Best-practice alignment: **Canonical** - good separation
- Maintenance burden: **Manageable** - components reusable

---

### Approach C: Utility-First

**What it does:** Create reusable utilities for search and colors, then use in present page.

**Files created:**
```
src/lib/utils/searchUtils.ts - debounced search helper
src/lib/utils/groupColors.ts - color assignment utility
```

**Trade-offs:**
- Implementation effort: **Moderate** - creates abstractions
- Best-practice alignment: **Acceptable** - utilities are reusable but may be YAGNI
- Maintenance burden: **Simple** - isolated utilities

---

## Step 4: Recommendation

**Chosen: Approach A (In-Place Enhancement)**

### Reasons:

1. **Minimal surface area.** The present page is 247 lines and self-contained. Extracting components would add complexity without clear reuse benefit.

2. **Focused scope.** US-5.2 and US-5.3 are enhancements to an already-working feature. In-place changes are easier to review and less risky.

**What would flip the choice:**
- If we planned to reuse StudentSearch elsewhere, Approach B would be better.
- If group colors were needed in other views (workspace, export), Approach C would provide value.

---

## Step 5: Implementation Tasks

### Task 1: Add Auto-Focus to Search Input

**Change:** When the "Find My Group" tab is selected, auto-focus the search input.

**Implementation:**
- Add `use:autofocus` action or `$effect` to focus when `viewMode === 'search'`
- Store ref to input element

**Code location:** Lines 176-182

---

### Task 2: Change Search Matching to Start-of-Name

**Change:** Match from start of name, not anywhere in name.

**Current:** `a.firstName.toLowerCase().includes(query)`

**New:** `a.firstName.toLowerCase().startsWith(query) || a.lastName.toLowerCase().startsWith(query)`

**Rationale:** Per spec: "partial match from start of name". A student searching "Al" should find "Alice" but not "Salma".

**Code location:** Lines 49-59

---

### Task 3: Add 150ms Debounce

**Change:** Debounce the search to handle fast typing.

**Implementation:**
```typescript
let searchQuery = $state('');
let debouncedQuery = $state('');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

$effect(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery = searchQuery;
  }, 150);
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
  };
});

// Use debouncedQuery in filteredAssignments
```

**Code location:** Lines 35-36, 49-59

---

### Task 4: Update No-Match Message

**Change:** Update message to match spec wording.

**Current:** "No students found matching "{query}"\nTry checking the spelling or use your full name"

**New:** "No student found. Check your spelling?"

**Code location:** Lines 186-194

---

### Task 5: Add "Other Members" Display (Optional Feature)

**Change:** When search shows a result, optionally show other members of the same group.

**Implementation:**
- Add derived state: `groupMembers` that finds other students in the matched group
- Show below the main result: "Also in Art Club: Bob, Carol, David"
- Only show for single match (when user has found their group)

**Code location:** After line 209 (inside the search result card)

---

### Task 6: Add Group Color Variety

**Change:** Assign different background colors to group cards for visual distinction.

**Implementation:**
- Define color palette: `['bg-teal', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-500', 'bg-emerald-600']`
- Assign colors by index: `colors[index % colors.length]`
- Apply to group card headers in both search results and all-groups view

**Code location:** Lines 206, 227

---

### Task 7: Verify Responsive Breakpoints

**Change:** Ensure grid adapts: 4 cols (xl) → 3 (lg) → 2 (md) → 1 (sm)

**Current:** `grid gap-6 md:grid-cols-2 lg:grid-cols-3`

**New:** `grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

**Code location:** Line 224

---

### Task 8: Handle Edge Cases

Per spec edge cases:

| Edge Case | Handling |
|-----------|----------|
| Common partial ("Al") | Show all matches - already works |
| Special characters | Test with apostrophes, hyphens - no code change needed |
| Fast typing | Handled by 150ms debounce (Task 3) |
| Clear search | Returns to empty state - already works |

---

## Step 6: Implementation Checklist

### US-5.2: Student Search (Find My Group)

- [ ] Large search input, auto-focused when tab selected (Task 1)
- [ ] As-you-type filtering (no submit button) - already works
- [ ] Case-insensitive, partial match from start of name (Task 2)
- [ ] Single match: Large card showing "Alice → Art Club" - already works
- [ ] Multiple matches: List of matches with group names - already works
- [ ] No match: "No student found. Check your spelling?" (Task 4)
- [ ] Result shows group name prominently - already works
- [ ] Optional: Show other group members (Task 5)
- [ ] Debounce 150ms (Task 3)

### US-5.3: All Groups View

- [ ] Grid of group cards - already works
- [ ] Each card: Group name (large), student list - already works
- [ ] Cards sized appropriately for projection - already works
- [ ] Responsive: Adjusts columns based on width (Task 7)
- [ ] Group colors for visual distinction (Task 6)
- [ ] Student names large enough - already works (text-lg)

---

## Files Summary

### Modified Files:
1. `src/routes/activities/[id]/present/+page.svelte` - all enhancements

### No New Files

This is a pure enhancement with no new abstractions needed.

---

## Test Scenarios

1. **Auto-focus:** Select "Find My Group" tab → cursor in search input
2. **Start-of-name match:** Type "Al" → shows "Alice", does NOT show "Salma"
3. **Debounce:** Type rapidly "alice" → only one filter operation after 150ms
4. **No match:** Type "xyz" → shows "No student found. Check your spelling?"
5. **Other members:** Search "Alice" (unique) → shows "Also in Art Club: Bob, Carol"
6. **Group colors:** "All Groups" view → each group has distinct header color
7. **Responsive:** Resize window → columns adjust (4→3→2→1)

---

## Ready for Approval

This plan enhances the present mode with targeted improvements that address all US-5.2 and US-5.3 requirements. The changes are confined to a single file with no architectural impact.

**Questions for clarification:**

1. **"Other members" feature**: Should this show ALL other members, or limit to first 3-4 with "and X more"?
2. **Color palette**: Should colors be consistent per group (e.g., "Art" is always teal) or vary per session?
