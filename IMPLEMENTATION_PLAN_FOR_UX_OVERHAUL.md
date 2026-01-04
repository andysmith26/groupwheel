# Groupwheel UX Overhaul: Implementation Plan

## Overview

This plan implements Approach C (Task-Based Architecture) incorporating learnings from the UX evaluation. The goal is to transform Groupwheel from a feature-oriented app into a task-oriented app that teachers can use without training.

**Key Principles:**
1. One Task Per Screen (with progressive disclosure for complex pages)
2. Linear Paths with Escape Hatches
3. Teacher Vocabulary Only
4. Smart Defaults with Discoverable Advanced Options
5. State is Always Obvious

**Critical Gaps Addressed:**
- Activity renaming capability
- Roster reuse for returning users
- Explicit publish workflow
- Post-creation guidance for advanced features
- Phase sequencing to avoid temporary feature loss

**Stakeholder Decisions:**
- Publish notifications: Not needed for MVP
- Templates: Per-user (not shared)
- Session history: View-only (no restore to previous session)
- Offline support: View cached data only, editing requires connection
- Analytics: Both high-level summary AND detailed breakdowns

---

## Phase 0: Foundation & Cleanup

**Goal:** Establish new route structure with redirects, ensuring no broken links. Old functionality continues to work.

**Duration:** 1-2 days

---

### US-0.1: Create Activities Route Structure

**As a** teacher
**I want** to access my activities at `/activities`
**So that** I can see all my grouping projects in one place

**Verification Specs:**
- [ ] `/activities` route exists and renders dashboard
- [ ] `/activities/new` route exists and renders wizard
- [ ] `/activities/[id]` route exists (hub page, not redirect)
- [ ] `/activities/[id]/setup` route exists (stub)
- [ ] `/activities/[id]/workspace` route exists (stub)
- [ ] `/activities/[id]/present` route exists (stub)
- [ ] All new routes are accessible without errors

**Edge Cases:**
- Invalid activity ID shows 404 or "Activity not found" message
- Unauthenticated user sees appropriate state (logged-out dashboard)

**Files to Create:**
```
src/routes/activities/+page.svelte
src/routes/activities/+layout.svelte
src/routes/activities/new/+page.svelte
src/routes/activities/[id]/+page.svelte
src/routes/activities/[id]/+layout.svelte
src/routes/activities/[id]/setup/+page.svelte
src/routes/activities/[id]/workspace/+page.svelte
src/routes/activities/[id]/present/+page.svelte
```

---

### US-0.2: Implement Route Redirects

**As a** user with old bookmarks or internal links
**I want** old URLs to redirect to new locations
**So that** nothing breaks during the transition

**Verification Specs:**
- [ ] `/groups` → `/activities`
- [ ] `/groups/new` → `/activities/new`
- [ ] `/groups/new/sheets` → `/activities/new` (sheet option inline)
- [ ] `/groups/templates` → `/activities` (templates now inline in setup)
- [ ] `/groups/[id]` → `/activities/[id]`
- [ ] `/groups/[id]/candidates` → `/activities/[id]/workspace`
- [ ] `/groups/[id]/students` → `/activities/[id]/setup`
- [ ] `/groups/[id]/students/[studentId]` → `/activities/[id]/setup`
- [ ] `/groups/[id]/sessions` → `/activities/[id]/setup`
- [ ] `/scenarios/[id]/student-view` → `/activities/[id]/present`
- [ ] `/algorithms` → `/activities` (or help page if exists)
- [ ] All redirects use 301 (permanent) status

**Edge Cases:**
- Query parameters are preserved through redirects
- Hash fragments are preserved
- Redirect chains don't exceed 2 hops

---

### US-0.3: Update Internal Navigation

**As a** developer
**I want** all internal links to use new routes
**So that** users don't hit unnecessary redirects

**Verification Specs:**
- [ ] All `href` attributes in components use `/activities/*` paths
- [ ] All `goto()` calls use `/activities/*` paths
- [ ] No component references old route paths
- [ ] Navigation works without console warnings

**Edge Cases:**
- Dynamic route construction handles edge cases (null IDs, etc.)

---

### TEST GATE 1: Route Structure Verification

**Human Verification Checklist:**
1. [ ] Navigate to `/activities` - see dashboard (may be empty/stub)
2. [ ] Navigate to `/activities/new` - see wizard start
3. [ ] Navigate to `/groups` - redirected to `/activities`
4. [ ] Navigate to `/groups/[existingId]` - redirected to `/activities/[id]`
5. [ ] Create activity via old wizard (still functional)
6. [ ] Existing activities still accessible
7. [ ] No console errors on any route
8. [ ] Mobile: routes load without layout issues

**Exit Criteria:** All old functionality works via new routes. No regressions.

---

## Phase 1: Dashboard & Activity Hub

**Goal:** New dashboard with activity cards showing status, actions, and rename capability.

**Duration:** 2-3 days

---

### US-1.1: Activity Dashboard with Cards

**As a** returning teacher
**I want** to see all my activities as cards with status
**So that** I know which ones need attention

**Verification Specs:**
- [ ] Dashboard shows grid/list of activity cards
- [ ] Each card shows: Activity name, student count, status indicator
- [ ] Status shows "Editing" (○) or "Published" (●)
- [ ] Primary action button: "Edit Groups" or "Continue Setup"
- [ ] "+ New Activity" button prominently displayed
- [ ] Empty state shows helpful message and CTA to create first activity
- [ ] Cards sorted by last modified (most recent first)

**Edge Cases:**
- 0 activities: Show empty state with illustration/guidance
- 1 activity: Single card centered or left-aligned appropriately
- 50+ activities: Consider pagination (defer if not needed for MVP)
- Long activity names: Truncate with ellipsis, full name on hover
- Activity with 0 students: Show "No students yet" instead of "0 students"

**Mockup:**
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
│  │         [...] ← │  │         [...] ← │  Overflow menu    │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### US-1.2: Activity Rename Capability

**As a** teacher
**I want** to rename my activity from the dashboard or workspace
**So that** I can fix auto-generated names or update for new semesters

**Verification Specs:**
- [ ] Dashboard card overflow menu includes "Rename" option
- [ ] Clicking "Rename" opens inline edit or modal with text input
- [ ] Activity name in Workspace header is clickable to edit
- [ ] Activity name in Hub page is clickable to edit
- [ ] Empty name is rejected with validation message
- [ ] Name saved immediately on blur or Enter
- [ ] Escape cancels edit and reverts to previous name
- [ ] Updated name appears immediately in all locations

**Edge Cases:**
- Very long names (100+ chars): Allow but truncate in display
- Names with special characters: Allow (no restrictions except empty)
- Duplicate names: Allow (activities identified by ID, not name)
- Rename while offline: Show error "Cannot rename while offline"

**Auto-Name Generation Logic:**
1. If groups are named: Use first group name + " Groups" (e.g., "Art Groups")
2. If auto-split: Use "Team Groups" or roster name + " Teams"
3. If roster from Sheets: Use sheet name + " Groups"
4. Fallback: "Activity - {date}"

---

### US-1.3: Activity Card Overflow Menu

**As a** teacher
**I want** additional actions in a menu on each activity card
**So that** the card stays clean but I can access less-common actions

**Verification Specs:**
- [ ] "..." button visible on each card
- [ ] Menu contains: Rename, Go to Setup, Duplicate, Archive, Delete
- [ ] Delete requires confirmation ("Delete 'Spring Clubs'? This cannot be undone.")
- [ ] Archive moves activity to hidden state (out of main view)
- [ ] Duplicate creates copy with name "{Original} (Copy)"
- [ ] Menu closes on outside click or Escape

**Edge Cases:**
- Menu near screen edge: Position to stay within viewport
- Touch devices: Menu accessible via tap
- Keyboard navigation: Arrow keys navigate menu items

---

### US-1.4: Activity Hub Page

**As a** teacher
**I want** a landing page for each activity showing my options
**So that** I can choose where to go next

**Verification Specs:**
- [ ] `/activities/[id]` shows hub page (not auto-redirect)
- [ ] Hub shows: Activity name (editable), status badge, last modified date
- [ ] Three clear action buttons:
  - "Edit Groups" → Workspace (primary if groups exist)
  - "Setup" → Setup page (primary if no groups yet)
  - "Present to Class" → Present mode
- [ ] Visual indication of current state (no groups, editing, published)
- [ ] If no groups exist, "Edit Groups" shows tooltip "Generate groups first"
- [ ] Quick stats: X students, Y groups

**Rationale:** Hub page preferred over auto-redirect per evaluation feedback—gives teachers explicit choice and reduces confusion.

**Edge Cases:**
- Activity deleted while viewing hub: Show "Activity not found" with link to dashboard
- Hub accessed via direct URL: Works without prior navigation context

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Activities                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Spring Clubs ✏️                           ● Published       │
│  Last edited: Jan 2, 2026                                   │
│                                                             │
│  32 students · 4 groups                                     │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │             │  │             │  │             │          │
│  │ Edit Groups │  │   Setup     │  │  Present    │          │
│  │   (primary) │  │             │  │  to Class   │          │
│  │             │  │             │  │             │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### US-1.5: Activity Status Model

**As a** system
**I want** clear activity status definitions
**So that** UI can consistently show state

**Status Definitions:**
| Status | Description | Visual |
|--------|-------------|--------|
| `DRAFT` | Activity created but no groups generated | ○ Draft |
| `EDITING` | Groups exist but not published | ○ Editing |
| `PUBLISHED` | Groups finalized and shared | ● Published |
| `ARCHIVED` | Hidden from main view | (not shown) |

**Verification Specs:**
- [ ] Status transitions: DRAFT → EDITING (on first generate)
- [ ] Status transitions: EDITING → PUBLISHED (on publish action)
- [ ] Status transitions: PUBLISHED → EDITING (on any edit after publish)
- [ ] Status transitions: Any → ARCHIVED (on archive action)
- [ ] Status stored in IndexedDB with activity
- [ ] Status reflected in UI immediately on change

---

### TEST GATE 2: Dashboard & Hub Verification

**Human Verification Checklist:**
1. [ ] Dashboard shows existing activities as cards
2. [ ] Card shows correct student count
3. [ ] Card shows correct status (Published vs Editing)
4. [ ] Click activity → Hub page with three clear options
5. [ ] Rename activity from dashboard menu → Name updates everywhere
6. [ ] Rename activity from hub header → Name updates
7. [ ] Delete activity → Confirmation → Activity removed
8. [ ] Duplicate activity → Copy appears with "(Copy)" suffix
9. [ ] Archive activity → Disappears from main list
10. [ ] Create new activity → Card appears on dashboard
11. [ ] Mobile: Cards stack vertically, menu accessible

**Exit Criteria:** Teachers can manage activities from dashboard without accessing old routes.

---

## Phase 2: Simplified Wizard

**Goal:** 3-step wizard that gets teachers to groups fast, with roster reuse for returning users.

**Duration:** 3-4 days

---

### US-2.1: Wizard Step 1 - Students

**As a** teacher
**I want** to quickly add my student roster
**So that** I can start creating groups

**Verification Specs:**
- [ ] Step shows "Step 1 of 3: Add Your Students"
- [ ] Progress bar shows 33% complete
- [ ] Three options clearly presented:
  - "Paste from spreadsheet" (default, expanded)
  - "Use existing roster" (if rosters exist, collapsed section)
  - "Import from Google Sheets" (if logged in, collapsed section)
- [ ] Paste area accepts CSV/TSV with auto-detection
- [ ] Preview shows parsed students: Name, any detected columns
- [ ] Student count shown: "32 students detected"
- [ ] Validation errors shown inline (e.g., "Row 5: Missing name")
- [ ] "Continue" button enabled only when valid students exist
- [ ] "Cancel" returns to dashboard with confirmation if data entered

**Edge Cases:**
- Pasted data with headers: Auto-detect and skip header row
- Single column paste: Treat as names only
- Duplicate names: Allow (students identified by generated ID)
- Empty paste: Show "Paste your student list above"
- Very large roster (500+): Show warning about performance
- Special characters in names: Preserve exactly as entered
- Trailing/leading whitespace: Trim automatically

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ Create Activity                                   [Cancel]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1 of 3: Add Your Students                             │
│  ━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░              │
│                                                             │
│  ○ Paste from spreadsheet                                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Name          Grade                             │        │
│  │ Alice Smith   5                                 │        │
│  │ Bob Jones     5                                 │        │
│  │ ...                                             │        │
│  └─────────────────────────────────────────────────┘        │
│  ✓ 32 students detected                                     │
│                                                             │
│  ▸ Use existing roster (3 saved)                            │
│  ▸ Import from Google Sheets                                │
│                                                             │
│                                          [Continue →]       │
└─────────────────────────────────────────────────────────────┘
```

---

### US-2.2: Roster Reuse for Returning Users

**As a** returning teacher
**I want** to use a roster I've already imported
**So that** I don't have to re-enter student names

**Verification Specs:**
- [ ] "Use existing roster" section shows only if saved rosters exist
- [ ] Section expands to show list of saved rosters
- [ ] Each roster shows: Name, student count, last used date
- [ ] Roster name format: Auto-generated from source or user-edited
- [ ] Selecting roster populates preview with students
- [ ] Option to "Edit this roster" (opens inline edit before continuing)
- [ ] Selected roster is linked to new activity (shared reference)
- [ ] Clear indication: "Changes to this roster affect all activities using it"

**Edge Cases:**
- Roster with 0 students: Show but indicate "(empty)"
- Roster used by multiple activities: Expected behavior, warn on edit
- Very long roster list (10+): Scrollable with search
- Roster name editing: Available in Setup page, not wizard

---

### US-2.3: Google Sheets Import (Inline)

**As a** logged-in teacher
**I want** to import students from Google Sheets
**So that** I can use my existing class roster

**Verification Specs:**
- [ ] "Import from Google Sheets" option visible only when logged in
- [ ] Clicking expands section: URL input field, Connect button
- [ ] After connecting: Sheet name shown, tab selector dropdown
- [ ] After selecting tab: Preview of parsed students
- [ ] Column mapping if needed (Name column selector)
- [ ] Connection saved for future reference
- [ ] "Disconnect" option available

**Edge Cases:**
- Invalid Sheet URL: Clear error "This doesn't look like a Google Sheets URL"
- Sheet without read permission: "Please grant access to this sheet" with re-auth button
- Empty sheet: "No data found in this sheet"
- Sheet with no obvious name column: Show column picker
- Network error during fetch: "Couldn't load sheet. Check your connection."

---

### US-2.4: Wizard Step 2 - Groups

**As a** teacher
**I want** to define my groups
**So that** students can be assigned to them

**Verification Specs:**
- [ ] Step shows "Step 2 of 3: Set Up Your Groups"
- [ ] Progress bar shows 66% complete
- [ ] Two modes clearly presented:
  - "Name your groups" (manual) - default if few students
  - "Split into teams" (auto) - default if many students
- [ ] Manual mode:
  - List of group name inputs with capacity field
  - "Add group" button
  - Delete (x) on each group
  - Minimum 1 group required
- [ ] Auto mode:
  - Slider or input: "Create [4] groups"
  - Shows calculated size: "~8 students each"
- [ ] Templates section (collapsed): "Or use a saved template"
- [ ] Back button returns to Step 1 preserving all data
- [ ] Continue button proceeds to Step 3

**Edge Cases:**
- 0 groups defined: Continue disabled, show "Add at least one group"
- More groups than students: Warning "You have more groups than students"
- Group with capacity 0: Treat as unlimited
- Duplicate group names: Allow (groups identified by ID)
- Very long group names (50+ chars): Allow but truncate in display

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ Create Activity                                   [Cancel]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 2 of 3: Set Up Your Groups                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░            │
│                                                             │
│  ● Name your groups                                         │
│  ┌──────────────────────────────────────────────┐           │
│  │ Group 1: [Art Club        ] Capacity: [10]  ×│           │
│  │ Group 2: [Drama Club      ] Capacity: [10]  ×│           │
│  │ Group 3: [Music Club      ] Capacity: [10]  ×│           │
│  │ Group 4: [Sports Club     ] Capacity: [  ]  ×│           │
│  │                            [+ Add group]     │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
│  ○ Split into teams automatically                           │
│                                                             │
│  ▸ Use a saved template                                     │
│                                                             │
│                              [← Back]  [Continue →]         │
└─────────────────────────────────────────────────────────────┘
```

---

### US-2.5: Wizard Step 3 - Review & Generate

**As a** teacher
**I want** to review my setup before generating groups
**So that** I can catch mistakes

**Verification Specs:**
- [ ] Step shows "Step 3 of 3: Review & Create"
- [ ] Progress bar shows 100%
- [ ] Summary panel shows:
  - **Students:** "{N} students" with collapsible list
  - **Groups:** Group names with capacities
  - **Activity name:** Editable text field (auto-generated default)
- [ ] Activity name field is prominent with clear edit affordance
- [ ] "Create Groups" button (primary action)
- [ ] Loading state during generation: spinner + "Generating groups..."
- [ ] Success: Redirect to Workspace with groups displayed
- [ ] Banner shown in Workspace (see US-2.6)

**Edge Cases:**
- Generation takes >3 seconds: Show progress indicator
- Generation fails: Show error with "Try again" button
- User clears name field: Show validation "Activity name required"
- User navigates away during generation: Warn "Generation in progress"

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ Create Activity                                   [Cancel]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 3 of 3: Review & Create                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│                                                             │
│  Activity Name                                              │
│  ┌─────────────────────────────────────────────┐            │
│  │ Art Club Groups                         ✏️  │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
│  Students                                                   │
│  32 students from pasted roster              [View list ▾]  │
│                                                             │
│  Groups                                                     │
│  4 groups: Art Club, Drama Club, Music Club, Sports Club    │
│                                                             │
│                              [← Back]  [Create Groups]      │
└─────────────────────────────────────────────────────────────┘
```

---

### US-2.6: Post-Creation Guidance Banner

**As a** teacher who just created groups
**I want** to know what else I can do
**So that** I discover advanced features when ready

**Verification Specs:**
- [ ] After wizard completion, Workspace shows dismissible banner at top
- [ ] Banner text: "Groups generated! Drag students to adjust."
- [ ] If no preferences: Additional text "Have student requests? Import them for smarter placement."
- [ ] Banner action button: "Import Preferences" → navigates to Setup > Preferences section
- [ ] Dismiss button (x) hides banner permanently for this activity
- [ ] Banner state tracked in activity metadata (`bannerDismissed: boolean`)
- [ ] Banner doesn't show if preferences already imported

**Edge Cases:**
- Banner dismissed accidentally: No way to restore (acceptable - info in Setup)
- Preferences already exist: Banner shows success state instead or is hidden
- Mobile: Banner takes full width, buttons stack

---

### TEST GATE 3: Wizard Verification

**Human Verification Checklist:**
1. [ ] Start new activity → 3-step wizard appears
2. [ ] Paste roster → Preview shows correct student count
3. [ ] Invalid paste (no recognizable names) → Shows validation error
4. [ ] Select existing roster (if available) → Students populate preview
5. [ ] Define groups manually → Names and capacities saved
6. [ ] Use auto-split → Shows reasonable distribution calculation
7. [ ] Review step shows accurate summary of choices
8. [ ] Edit activity name on review step → Name persists
9. [ ] Click "Create Groups" → Loading state → Redirects to Workspace
10. [ ] Workspace shows generated groups with students distributed
11. [ ] Guidance banner appears with preferences link
12. [ ] Dismiss banner → Banner gone, doesn't return
13. [ ] Mobile: Wizard steps scrollable, all inputs accessible

**Exit Criteria:** New teacher can create first activity in under 3 minutes.

---

## Phase 3: Workspace

**Goal:** Clean editing interface with drag-drop, undo/redo, and clear path to presenting.

**Duration:** 3-4 days

---

### US-3.1: Workspace Layout

**As a** teacher
**I want** a clean workspace for editing groups
**So that** I can focus on arranging students

**Verification Specs:**
- [ ] Header: Back link (to Hub), Activity name (editable), "Show to Class" button
- [ ] Toolbar: Undo, Redo, Analytics summary, Regenerate dropdown, overflow menu (...)
- [ ] Main area: Groups displayed as cards in responsive grid
- [ ] Footer hint: "Drag students between groups • Changes save automatically"
- [ ] No sidebar or panels by default (analytics inline)
- [ ] Responsive: Groups reflow/stack on narrow screens

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Spring Clubs ✏️                            [Show to Class] │
├─────────────────────────────────────────────────────────────┤
│ [↩ Undo] [↪ Redo]  │ 72% got 1st choice  │ [↻ Regenerate ▾] […]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Art      │  │ Drama    │  │ Music    │  │ Sports   │     │
│  │ (8/10)   │  │ (7/10)   │  │ (9/10)   │  │ (8/10)   │     │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤     │
│  │ Alice ★  │  │ David    │  │ Grace    │  │ Leo      │     │
│  │ Bob      │  │ Emma ★   │  │ Henry ★  │  │ Mike ★   │     │
│  │ Carol    │  │ Frank    │  │ Ivy      │  │ Nina     │     │
│  │ ...      │  │ ...      │  │ ...      │  │ ...      │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  Drag students between groups • Changes save automatically  │
└─────────────────────────────────────────────────────────────┘
```

---

### US-3.2: Drag and Drop Editing

**As a** teacher
**I want** to drag students between groups
**So that** I can make manual adjustments

**Verification Specs:**
- [ ] Student names are draggable (cursor changes on hover)
- [ ] Drop zones highlight on drag over (visual feedback)
- [ ] Dropped student moves to new group immediately
- [ ] Original group updates count instantly
- [ ] Change auto-saved (debounced 500ms)
- [ ] Save indicator: subtle "Saving..." then "Saved ✓" in toolbar
- [ ] Touch support: Long press initiates drag on mobile/tablet

**Edge Cases:**
- Drop outside any group: Student returns to original position with animation
- Drag to same group: No-op, no error, no save triggered
- Rapid multiple drags: Changes queued, saved in order
- Group at capacity: Allow drop anyway (capacity is advisory/soft limit)
- Drag while save in progress: Queue next change

---

### US-3.3: Undo/Redo

**As a** teacher
**I want** to undo my changes
**So that** I can fix mistakes quickly

**Verification Specs:**
- [ ] Undo button reverts last drag operation
- [ ] Redo button re-applies undone operation
- [ ] Buttons visually disabled when stack is empty
- [ ] Keyboard shortcuts: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo)
- [ ] History persists during page session
- [ ] History cleared on: Regenerate, leaving workspace, publish
- [ ] Maximum 50 undo steps (oldest dropped when exceeded)

**Edge Cases:**
- Undo when nothing to undo: Button disabled, no action
- Undo, then make new change: Redo stack cleared
- Page refresh: Undo history lost (acceptable)

---

### US-3.4: Regenerate Groups

**As a** teacher
**I want** to regenerate groups with different options
**So that** I can try different arrangements

**Verification Specs:**
- [ ] "Regenerate" dropdown button in toolbar
- [ ] Dropdown options:
  - "Shuffle again" - re-run algorithm with new random seed
  - "Start fresh" - clear all and regenerate from scratch
- [ ] If manual changes exist, confirm: "This will replace your changes. Continue?"
- [ ] Regenerate clears undo history
- [ ] Regenerate honors preferences if imported
- [ ] Loading state during regeneration
- [ ] Analytics summary updates after regeneration

**Edge Cases:**
- Regenerate produces similar result: Expected (random), user can try again
- Regenerate with preferences: Algorithm considers preferences
- Cancel confirmation: No changes made

---

### US-3.5: Analytics Summary (Inline + Detail)

**As a** teacher
**I want** to see group quality metrics
**So that** I know if the arrangement is good

**Verification Specs:**
- [ ] **Inline summary** in toolbar: "72% got 1st choice" or "Groups balanced (±1)"
- [ ] Clicking summary opens **detail panel/popover**
- [ ] Detail panel shows:
  - Preference satisfaction breakdown (if preferences exist):
    - 1st choice: 72% (23 students)
    - 2nd choice: 18% (6 students)
    - 3rd choice: 6% (2 students)
    - No preference: 1 student
  - Group balance: Min 7, Max 9, Target 8
  - Any issues flagged (e.g., "2 students didn't get any choice")
- [ ] If no preferences: Show balance metrics only
- [ ] Summary updates on any change (drag, regenerate)
- [ ] Detail panel closeable

**Edge Cases:**
- All students got 1st choice: "100% got 1st choice ✓" (success state)
- No preferences imported: Only show group size balance
- Students without preferences: Listed separately in breakdown

---

### US-3.6: Student Info on Hover/Click

**As a** teacher
**I want** to see student details without leaving workspace
**So that** I can make informed decisions

**Verification Specs:**
- [ ] Desktop: Hover on student name shows tooltip after 300ms delay
- [ ] Mobile: Tap student name shows popover
- [ ] Info shown:
  - Full name
  - Preference info: "Requested: Art (1st), Drama (2nd)" or "No preferences"
  - Satisfaction: "✓ Got 1st choice" or "Got 3rd choice"
- [ ] Visual indicator on student card if got top choice (★ or checkmark)
- [ ] Popover/tooltip closes on outside click or mouse leave

**Edge Cases:**
- Student with no metadata: Show name only
- Long preference list: Show first 3 + "and X more"
- Hover during drag: Tooltip suppressed

---

### US-3.7: Workspace Overflow Menu

**As a** teacher
**I want** access to less-common actions
**So that** the toolbar stays uncluttered

**Verification Specs:**
- [ ] "..." button in toolbar opens dropdown menu
- [ ] Menu items:
  - "Export as CSV" → Downloads immediately
  - "Export for Google Classroom" → Downloads in GC format
  - "Print view" → Opens print-optimized view / browser print
  - "Go to Setup" → Navigate to Setup page
- [ ] Menu closes on selection or outside click

**Edge Cases:**
- Export empty groups: Include group names with no students
- Print with many groups: Pagination handled by browser

---

### US-3.8: Show to Class Navigation

**As a** teacher
**I want** to quickly present groups to my class
**So that** students can find their groups

**Verification Specs:**
- [ ] "Show to Class" button prominent in header (primary button style)
- [ ] Clicking navigates to Present page
- [ ] If activity not published, show prompt: "Publish these groups first?"
  - Options: "Publish & Present" (publishes, then navigates) or "Just Preview"
- [ ] Present page URL is shareable/bookmarkable

---

### TEST GATE 4: Workspace Verification

**Human Verification Checklist:**
1. [ ] Workspace loads with generated groups displayed
2. [ ] Activity name clickable and editable
3. [ ] Drag student to different group → Move succeeds, visual feedback
4. [ ] Save indicator shows "Saving..." then "Saved"
5. [ ] Undo → Student returns to original group
6. [ ] Redo → Student moves again
7. [ ] Regenerate "Shuffle" → Groups reshuffled, confirmation shown if changes exist
8. [ ] Analytics summary shows meaningful metric
9. [ ] Click analytics summary → Detail panel opens with breakdown
10. [ ] Hover student → Tooltip shows preference info
11. [ ] Export CSV → File downloads with correct data
12. [ ] "Show to Class" → Prompt about publishing → Navigate to Present
13. [ ] Mobile: Touch drag works, all features accessible

**Exit Criteria:** Teacher can edit groups without confusion about state or available actions.

---

## Phase 4: Setup Page

**Goal:** Single configuration page with progressive disclosure for advanced features.

**Duration:** 2-3 days

---

### US-4.1: Setup Page Layout with Sections

**As a** teacher
**I want** one place to configure my activity
**So that** I don't hunt through multiple pages for settings

**Verification Specs:**
- [ ] Page header: Back link (to Hub), Activity name (editable), "Generate Groups" button
- [ ] Four sections with clear headers and expand/collapse:
  1. **Students** - roster management
  2. **Groups** - group configuration
  3. **Student Preferences** - optional, clearly marked
  4. **History** - past published sessions
- [ ] Section headers show summary: "Students (32)", "Groups (4 configured)"
- [ ] Sections use accordion or all-expandable pattern
- [ ] Primary/secondary visual hierarchy (Preferences and History are secondary)
- [ ] Help text on sections explains purpose

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ ← Spring Clubs Setup                       [Generate Groups]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ▼ Students (32)                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ View and edit your student roster                    │   │
│  │                                                      │   │
│  │ Alice Smith, Bob Jones, Carol White, David Brown...  │   │
│  │ [View all] [Add student] [Import more]               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ▼ Groups (4)                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Art Club (10), Drama Club (10), Music (10), Sports   │   │
│  │ [Edit groups] [Use template] [Save as template]      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ▸ Student Preferences (Optional)                           │
│    Import student group requests for smarter placement      │
│                                                             │
│  ▸ History                                                  │
│    View past published group arrangements                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### US-4.2: Students Section (Roster Management)

**As a** teacher
**I want** to view and edit my student roster
**So that** I can add or remove students after initial import

**Verification Specs:**
- [ ] Collapsed: Shows count and preview "32 students: Alice, Bob, Carol..."
- [ ] Expanded: Scrollable list of all students
- [ ] Search/filter box if >20 students
- [ ] Each student row shows: Name, delete button (x)
- [ ] "Add student" button: Opens inline input for name
- [ ] "Import more" button: Opens modal with paste/sheets options
- [ ] Delete confirmation: "Remove Alice? They'll be removed from their group too."
- [ ] Changes save automatically

**Edge Cases:**
- Remove student assigned to group: Also removes from group, group count updates
- Add student: Added to "Unassigned" pool or prompted to assign
- Duplicate name on add: Allow with visual note
- Search no results: "No students match 'xyz'"

---

### US-4.3: Groups Section (Configuration)

**As a** teacher
**I want** to modify my group configuration
**So that** I can add, remove, or adjust groups

**Verification Specs:**
- [ ] Collapsed: Shows group names and count
- [ ] Expanded: Editable list of groups
- [ ] Each group: Name input, capacity input (optional), delete button
- [ ] "Add group" button at bottom
- [ ] Reorder via drag handles
- [ ] "Use template" button: Opens template picker modal
- [ ] "Save as template" button: Saves current config as user template
- [ ] Changes save automatically
- [ ] Note: "Changes to groups require regenerating to take effect"

**Edge Cases:**
- Delete group with students: Show modal "Move 8 students to:" with group picker
- Reduce capacity below current: Warning only (soft limit)
- Delete all groups: Show "Add at least one group to generate"
- Rename group: Updates everywhere immediately

---

### US-4.4: Templates Management (Per-User)

**As a** teacher
**I want** to save and reuse group configurations
**So that** I don't recreate common setups

**Verification Specs:**
- [ ] "Use template" opens modal with template list
- [ ] Each template shows: Name, group count, group names preview
- [ ] Selecting template: Confirmation "Replace current groups with this template?"
- [ ] "Save as template" prompts for template name
- [ ] Default name suggestion: "4 Groups Template" or activity-derived
- [ ] Templates stored per-user in IndexedDB
- [ ] Template list shows: Edit name, Delete options
- [ ] Empty state: "No templates saved yet"

**Edge Cases:**
- Apply template with more groups than students: Warn, allow
- Delete template: No effect on activities that used it (config was copied)
- Template name collision: Allow (or append number)

---

### US-4.5: Preferences Section (Optional)

**As a** teacher
**I want** to import student preferences
**So that** the algorithm can honor their group requests

**Verification Specs:**
- [ ] Section marked "(Optional)" in header
- [ ] Help text: "Have a form where students ranked their choices? Import it here."
- [ ] Two import methods:
  - "Paste CSV" with format example shown
  - "Import from Google Sheets" (if logged in)
- [ ] Format example shown:
  ```
  Student,Choice 1,Choice 2,Choice 3
  Alice,Art,Drama,Music
  Bob,Sports,Art,Drama
  ```
- [ ] After import: Preview of parsed preferences
- [ ] Validation warnings:
  - "Student 'Zoe' not found in roster" (yellow warning, skippable)
  - "Group 'Cooking' not configured" (yellow warning)
- [ ] Success state: "24 of 32 students have preferences"
- [ ] "Clear all preferences" button with confirmation

**Edge Cases:**
- Student name mismatch: Fuzzy match suggestion or skip
- Group name mismatch: Show warning, can proceed
- Partial preferences: OK, algorithm handles students without prefs
- Re-import: Replaces existing preferences (confirm first)

---

### US-4.6: History Section (View-Only)

**As a** teacher
**I want** to see past published arrangements
**So that** I can reference previous decisions

**Verification Specs:**
- [ ] Shows list of published sessions in reverse chronological order
- [ ] Each entry shows: Date/time, student count, group count
- [ ] Clicking entry expands to show that arrangement (read-only)
- [ ] Expanded view: Groups with student lists (not editable)
- [ ] No restore functionality (per stakeholder decision - view only)
- [ ] Empty state: "No history yet. Groups appear here after publishing."

**Edge Cases:**
- Many sessions (10+): Scrollable list
- Session from before roster change: Show as-was, note discrepancies
- Delete session: Not supported (history is immutable audit log)

---

### US-4.7: Generate/Update Groups Button

**As a** teacher
**I want** to generate groups from the Setup page
**So that** I can apply my configuration changes

**Verification Specs:**
- [ ] Button label: "Generate Groups" if none exist, "Regenerate Groups" if exist
- [ ] Position: Header (sticky) for easy access
- [ ] Clicking runs algorithm with current config
- [ ] If groups exist: Confirm "Regenerate will create new groups. Current arrangement will be lost."
- [ ] Uses preferences if imported
- [ ] Loading state during generation
- [ ] On success: Navigate to Workspace

---

### TEST GATE 5: Setup Page Verification

**Human Verification Checklist:**
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

**Exit Criteria:** Teacher can fully configure activity without navigating elsewhere.

---

## Phase 5: Present Mode & Publish Flow

**Goal:** Clean presentation mode with explicit publish workflow.

**Duration:** 2 days

---

### US-5.1: Present Mode Layout

**As a** teacher presenting to class
**I want** a clean, projection-friendly view
**So that** students can clearly see their groups

**Verification Specs:**
- [ ] Minimal chrome - focused on content
- [ ] Header: Activity name only, "Done" button
- [ ] Two view modes as tabs: "Find My Group" | "All Groups"
- [ ] Large, readable text (suitable for projection)
- [ ] High contrast colors
- [ ] No editing controls visible
- [ ] URL shareable - students could bookmark

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ Spring Clubs                                        [Done]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│      [Find My Group]        [All Groups]                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │   🔍  Type your name...                             │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### US-5.2: Student Search (Find My Group)

**As a** student looking at the projected screen
**I want** to search for my name
**So that** I can quickly find my assigned group

**Verification Specs:**
- [ ] Large search input, auto-focused when tab selected
- [ ] As-you-type filtering (no submit button needed)
- [ ] Case-insensitive, partial match from start of name
- [ ] Results appear below search:
  - Single match: Large card showing "Alice → Art Club"
  - Multiple matches: List of matches with group names
  - No match: "No student found. Check your spelling?"
- [ ] Result shows group name prominently
- [ ] Optional: Show other group members

**Edge Cases:**
- Common partial name ("Al"): Show all matches
- Special characters in name: Match works
- Very fast typing: Debounce 150ms
- Clear search: Show empty state again

---

### US-5.3: All Groups View

**As a** teacher
**I want** to show all groups at once
**So that** everyone can see the full arrangement

**Verification Specs:**
- [ ] Grid of group cards
- [ ] Each card: Group name (large), student list
- [ ] Cards sized appropriately for projection
- [ ] Responsive: Adjusts columns (4 → 2 → 1) based on width
- [ ] Group colors or icons for visual distinction
- [ ] Student names large enough to read from back of room

---

### US-5.4: Explicit Publish Workflow

**As a** teacher
**I want** to explicitly publish my groups
**So that** I know when groups are finalized

**Implementation: Prompt on "Show to Class"**

**Verification Specs:**
- [ ] When clicking "Show to Class" from Workspace:
  - If status is EDITING: Show publish prompt
  - If status is PUBLISHED: Go directly to Present
- [ ] Publish prompt modal:
  - "Publish these groups?"
  - "Publishing saves this arrangement to history."
  - Buttons: [Publish & Present] [Just Preview]
- [ ] "Publish & Present":
  1. Sets status to PUBLISHED
  2. Creates history entry with timestamp
  3. Navigates to Present mode
- [ ] "Just Preview":
  - Navigates to Present without publishing
  - Status remains EDITING
- [ ] After any edit post-publish: Status reverts to EDITING
- [ ] Visual indicator in Workspace when published: "Published ✓" badge

**Edge Cases:**
- Edit after publish: Status changes to EDITING, no prompt on subsequent presents
- Multiple publishes: Each creates new history entry
- Publish with no changes since last: Allow (creates timestamped entry)

---

### US-5.5: Done Presenting Flow

**As a** teacher done presenting
**I want** to return to my workspace easily
**So that** I can make changes if needed

**Verification Specs:**
- [ ] "Done" button returns to Workspace (not Hub)
- [ ] Keyboard shortcut: Escape key
- [ ] No confirmation needed (no data to lose in Present mode)
- [ ] If came from direct URL (not from Workspace): Go to Hub

---

### TEST GATE 6: Present & Publish Verification

**Human Verification Checklist:**
1. [ ] From Workspace, click "Show to Class" → Publish prompt appears
2. [ ] Select "Just Preview" → Present mode, status unchanged
3. [ ] Return, click "Show to Class" again → Prompt still appears
4. [ ] Select "Publish & Present" → Present mode, status shows "Published"
5. [ ] "Find My Group" tab: Search works, shows correct group
6. [ ] "All Groups" tab: All groups visible with students
7. [ ] Present URL is shareable (open in incognito → same view)
8. [ ] Click "Done" → Returns to Workspace
9. [ ] Check Setup > History → Published session appears with timestamp
10. [ ] Make edit in Workspace → Status changes back to "Editing"
11. [ ] Mobile/Tablet: Present mode readable, search works with on-screen keyboard

**Exit Criteria:** Full workflow from creation to presentation works end-to-end with explicit publish.

---

## Phase 6: Cleanup & Polish

**Goal:** Remove old code, update documentation, final polish.

**Duration:** 1-2 days

---

### US-6.1: Remove Old Routes and Components

**As a** developer
**I want** to remove deprecated code
**So that** the codebase stays maintainable

**Verification Specs:**
- [ ] Delete old route directories (after confirming redirects work):
  ```
  src/routes/groups/         (entire directory)
  src/routes/scenarios/      (entire directory)
  src/routes/algorithms/     (entire directory if exists)
  ```
- [ ] Delete old wizard step components:
  ```
  src/lib/components/wizard/StepName.svelte
  src/lib/components/wizard/StepSelectRoster.svelte
  src/lib/components/wizard/StepPreferences.svelte
  src/lib/components/wizard/StepGroupsUnified.svelte
  src/lib/components/wizard/StepGroupsFork.svelte
  ```
- [ ] Delete removed workspace components:
  ```
  src/lib/components/editing/AnalyticsPanel.svelte (if separate)
  src/lib/components/editing/HistorySelector.svelte
  Layout toggle components (if any)
  ```
- [ ] No TypeScript/import errors after deletion
- [ ] All tests pass
- [ ] No dead code warnings

**Safety Check:**
- Run full build before deletion
- Run full test suite before and after
- Git commit before deletion for easy rollback

---

### US-6.2: Update Documentation

**As a** developer
**I want** documentation to match the new architecture
**So that** future developers understand the system

**Verification Specs:**
- [ ] `CLAUDE.md` - Update route structure, component locations
- [ ] `docs/ARCHITECTURE.md` - Update with new flow diagrams
- [ ] `docs/PRODUCT.md` - Update user flows, remove old references
- [ ] `docs/STATUS.md` - Update current state, mark old gaps as resolved
- [ ] `docs/domain_model.md` - Update if entity changes (Activity status)
- [ ] Remove references to old route names throughout docs
- [ ] Delete `PLAN.md` (superseded by this implementation plan)
- [ ] Keep `IMPLEMENTATION_PLAN_FOR_UX_OVERHAUL.md` as reference

---

### US-6.3: UI Polish and Consistency

**As a** teacher
**I want** a polished, consistent interface
**So that** the app feels professional and trustworthy

**Verification Specs:**
- [ ] Consistent button styles (primary, secondary, danger) across all pages
- [ ] Consistent spacing and typography scale
- [ ] Loading states on all async operations (spinners, skeletons)
- [ ] Error states with clear, helpful messages
- [ ] Empty states with guidance and CTAs
- [ ] Smooth transitions/animations (not jarky or missing)
- [ ] Focus states visible for keyboard navigation
- [ ] ARIA labels on interactive elements

---

### US-6.4: Error Handling and Edge Cases

**As a** teacher
**I want** clear feedback when something goes wrong
**So that** I can recover or understand what happened

**Verification Specs:**
- [ ] Network errors: "You're offline. Changes will sync when reconnected." (if applicable)
- [ ] Validation errors: Specific field highlighted with message
- [ ] 404 pages: "Activity not found" with link to Dashboard
- [ ] Unexpected errors: "Something went wrong. Please refresh the page."
- [ ] No unhandled promise rejections in console
- [ ] Error boundary catches component crashes gracefully

---

### US-6.5: Update E2E Tests

**As a** developer
**I want** tests to cover the new flows
**So that** regressions are caught

**Verification Specs:**
- [ ] E2E test: Create new activity via wizard
- [ ] E2E test: Edit groups via drag and drop
- [ ] E2E test: Publish and present flow
- [ ] E2E test: Setup page - add student, import preferences
- [ ] E2E test: Dashboard - rename, delete activity
- [ ] Remove/update tests for old routes
- [ ] All tests pass in CI

---

### FINAL TEST GATE: End-to-End Verification

**Human Verification Checklist:**

**First-Time User Journey (Target: < 5 minutes)**
1. [ ] Land on `/activities` → Empty state with "Create your first activity"
2. [ ] Click "New Activity" → Wizard Step 1
3. [ ] Paste roster → Preview correct → Continue
4. [ ] Define groups → Continue
5. [ ] Review → Edit name if desired → "Create Groups"
6. [ ] Workspace loads with groups → Banner appears
7. [ ] Drag a student → Move succeeds → "Saved"
8. [ ] Click "Show to Class" → Publish prompt → "Publish & Present"
9. [ ] Present mode → Search works → "Done"
10. [ ] Back to Workspace → Status shows "Published"
11. [ ] Total time under 5 minutes? ____

**Returning User Journey**
1. [ ] Dashboard shows previous activity
2. [ ] Click activity → Hub with 3 options
3. [ ] Click "Edit Groups" → Workspace loads
4. [ ] Go to Setup (via Hub or menu) → See all config sections
5. [ ] Add a student → Regenerate → New arrangement
6. [ ] Create new activity using existing roster
7. [ ] Check History → Previous publish visible

**Error Scenarios**
1. [ ] Paste invalid data → Clear error shown
2. [ ] Navigate to `/activities/nonexistent` → 404 with Dashboard link
3. [ ] Rename to empty string → Validation prevents save

**Mobile Testing**
1. [ ] Dashboard: Cards stack, readable
2. [ ] Wizard: All steps scrollable and usable
3. [ ] Workspace: Touch drag works
4. [ ] Present: Search usable with on-screen keyboard

**Accessibility Quick Check**
1. [ ] Tab through wizard → Logical order
2. [ ] Focus visible on all interactive elements
3. [ ] Color contrast appears sufficient

**Exit Criteria:** App is ready for first customers. Core workflow completes without confusion or errors.

---

## Implementation Sequence Summary

```
Phase 0: Foundation (1-2 days)
├── US-0.1: Route structure
├── US-0.2: Redirects
├── US-0.3: Internal navigation
└── 🚦 TEST GATE 1

Phase 1: Dashboard & Hub (2-3 days)
├── US-1.1: Activity cards
├── US-1.2: Rename capability
├── US-1.3: Card overflow menu
├── US-1.4: Activity hub page
├── US-1.5: Status model
└── 🚦 TEST GATE 2

Phase 2: Wizard (3-4 days)
├── US-2.1: Step 1 - Students
├── US-2.2: Roster reuse
├── US-2.3: Google Sheets import
├── US-2.4: Step 2 - Groups
├── US-2.5: Step 3 - Review
├── US-2.6: Post-creation banner
└── 🚦 TEST GATE 3

Phase 3: Workspace (3-4 days)
├── US-3.1: Layout
├── US-3.2: Drag and drop
├── US-3.3: Undo/Redo
├── US-3.4: Regenerate
├── US-3.5: Analytics (inline + detail)
├── US-3.6: Student info popover
├── US-3.7: Overflow menu
├── US-3.8: Show to class
└── 🚦 TEST GATE 4

Phase 4: Setup Page (2-3 days)
├── US-4.1: Layout with sections
├── US-4.2: Students section
├── US-4.3: Groups section
├── US-4.4: Templates management
├── US-4.5: Preferences section
├── US-4.6: History section
├── US-4.7: Generate button
└── 🚦 TEST GATE 5

Phase 5: Present & Publish (2 days)
├── US-5.1: Present layout
├── US-5.2: Student search
├── US-5.3: All groups view
├── US-5.4: Publish workflow
├── US-5.5: Done presenting
└── 🚦 TEST GATE 6

Phase 6: Cleanup (1-2 days)
├── US-6.1: Remove old code
├── US-6.2: Update docs
├── US-6.3: UI polish
├── US-6.4: Error handling
├── US-6.5: Update tests
└── 🏁 FINAL TEST GATE
```

**Total Estimated Effort:** 14-18 days of focused development

---

## Risk Mitigation Strategies

### 1. Phase Sequencing
**Risk:** Deleting old code before new code is ready
**Mitigation:**
- Do NOT delete `StepPreferences.svelte` until `US-4.5: Preferences Section` is complete
- Old wizard remains functional until Phase 2 test gate passes
- Phase 6 cleanup only happens after all test gates pass

### 2. Data Compatibility
**Risk:** Existing activities break with new code
**Mitigation:**
- Activity data model changes are additive (new fields have defaults)
- Test with existing IndexedDB data before each test gate
- Document any migration needs

### 3. Feature Parity
**Risk:** Losing functionality users depend on
**Mitigation:**
- Preference import is NOT removed until Setup page version works
- Export functionality preserved in Workspace menu
- All current flows traced through new architecture

### 4. Scope Creep
**Risk:** Adding features during implementation
**Mitigation:**
- Each phase has defined scope - defer additions to backlog
- Test gates force completion before moving on
- "Nice to have" items marked and tracked separately

### 5. Incremental Delivery
**Risk:** Big-bang release with many bugs
**Mitigation:**
- Each phase delivers working software
- Can pause at any test gate boundary
- Consider deploying behind feature flag after Phase 2

---

## Dependencies & Prerequisites

### Technical Prerequisites
- [ ] IndexedDB schema supports new `status` field on activities
- [ ] Existing roster/pool data structure compatible with reuse feature
- [ ] Template storage mechanism defined (IndexedDB collection)

### External Dependencies
- Google Sheets API integration (existing, needs to work in new wizard)
- No new external dependencies required

### Team Prerequisites
- Designer review of mockups before Phase 1 (if available)
- Stakeholder available for test gate reviews

---

## Post-Launch Considerations

Items explicitly deferred from this plan:

1. **Student Portal** - Students access their own groups (requires auth)
2. **Conflict Rules UI** - "Never pair these students" feature
3. **Multiple Algorithms** - Let teachers choose algorithm type
4. **Offline Editing** - Full offline support with sync
5. **Sharing/Collaboration** - Multi-teacher access to activities
6. **Notifications** - Email/push on publish
7. **Data Export** - Bulk export all activities

These can be planned as follow-up work after the UX overhaul is complete and validated with real users.
