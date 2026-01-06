# Implementation Plan: Wizard UX Consistency & Preferences Discoverability

## Research Summary

### Current State Analysis

**1. Wizard Structure** (`src/routes/activities/new/+page.svelte`)
- 3-step flow: Students → Groups → Review (currentStep 0-2)
- Step labels defined at line 152: `['Students', 'Groups', 'Review']` (noun-based)
- Floating sheet connector at top of page (lines 414-481) - separate from step content
- Navigation footer inconsistent between steps (lines 542-581)

**2. Step 1: Students** (`src/lib/components/wizard/StepStudentsUnified.svelte`)
- Uses collapsible accordion sections (expandedSection state, lines 376-785)
- Each section has: button header with check indicator, expand/collapse chevron
- Pattern: click header to expand, content shows below
- Google Sheets section only visible when `userLoggedIn` (line 593)
- No radio button visual; uses check-in-circle for selected state

**3. Step 2: Groups** (`src/lib/components/wizard/StepGroupsUnified.svelte`)
- Uses two large card buttons for mode selection (lines 224-326)
- Pattern: big clickable cards with icon, title, description, checkmark when selected
- Mode selector cards are 2-column grid
- Conditional content below based on mode (specific vs auto)
- "How would you like to add groups?" uses inline button tabs (lines 336-369)

**4. Review Step** (`src/lib/components/wizard/StepReviewGenerate.svelte`)
- Already has preferences signpost at line 247-251
- "Create Groups" button at bottom (lines 254-276)
- Back button separate in parent page (lines 571-580)

**5. Progress Component** (`src/lib/components/wizard/WizardProgress.svelte`)
- Accepts `labels` prop (defaults to `['Students', 'Groups', 'Review']`)
- Change only requires updating parent page

**6. Workspace Preferences Banner** (`src/routes/activities/[id]/workspace/+page.svelte`)
- Existing post-creation banner (lines 831-868): teal themed, dismissible
- Shows when `showGuidanceBanner && !bannerDismissed && scenario && view`
- Already has link to `/activities/{program.id}/setup#preferences`
- Uses session state for dismissal (not localStorage)

**7. Preference Import** (`src/lib/components/wizard/StepPreferences.svelte`)
- Full-featured preference import UI (669 lines)
- Supports paste and sheet import
- Has format detection, preview, validation
- Can be extracted/reused for modal

### Architecture Constraints Verified
- UI components should NOT contain business logic
- Preference saving via existing use cases in `appEnvUseCases`
- localStorage is acceptable for banner dismissal (per `syncSettings.svelte.ts` pattern)
- Modal pattern exists in `PublishSessionModal.svelte`, `SaveTemplateModal.svelte`

---

## Proposed Approaches

### Approach A: Incremental Refactoring (Recommended)

Keep existing component structure, refactor in place with minimal new files.

**Files Modified:**
1. `src/routes/activities/new/+page.svelte` - Update labels, integrate sheet connection, standardize footer
2. `src/lib/components/wizard/WizardProgress.svelte` - No changes needed (accepts labels prop)
3. `src/lib/components/wizard/StepStudentsUnified.svelte` - Refactor to radio-card pattern
4. `src/lib/components/wizard/StepGroupsUnified.svelte` - Refactor to match Step 1 pattern
5. `src/lib/components/wizard/StepReviewGenerate.svelte` - Minor text update (already has signpost)
6. `src/routes/activities/[id]/workspace/+page.svelte` - Add preferences banner with localStorage dismissal

**New Files:**
1. `src/lib/components/workspace/PreferencesPromptBanner.svelte` - Banner component
2. `src/lib/components/workspace/PreferencesImportModal.svelte` - Modal wrapping StepPreferences internals

**Trade-offs:**
- Implementation effort: **Moderate** (mostly refactoring existing components)
- Best-practice alignment: **Canonical** (follows existing patterns, no new abstractions)
- Maintenance burden: **Simple** (minimal new components, no shared state)

---

### Approach B: Extract Shared RadioCardGroup Component

Create a reusable RadioCardGroup.svelte for both wizard steps.

**Files Modified:**
1. All files from Approach A
2. `src/lib/components/wizard/StepStudentsUnified.svelte` - Use RadioCardGroup
3. `src/lib/components/wizard/StepGroupsUnified.svelte` - Use RadioCardGroup

**New Files:**
1. `src/lib/components/ui/RadioCardGroup.svelte` - Shared selection pattern
2. `src/lib/components/workspace/PreferencesPromptBanner.svelte`
3. `src/lib/components/workspace/PreferencesImportModal.svelte`

**Trade-offs:**
- Implementation effort: **Significant** (new abstraction requires API design)
- Best-practice alignment: **Acceptable** (DRY, but may be premature abstraction)
- Maintenance burden: **Manageable** (one more component to maintain)

---

### Approach C: Full Step Component Rewrite

Rewrite StepStudentsUnified and StepGroupsUnified from scratch with unified design.

**Files Modified/New:**
1. Rewrite `StepStudentsUnified.svelte` completely
2. Rewrite `StepGroupsUnified.svelte` completely
3. New `RadioCardOption.svelte` component
4. New `PreferencesPromptBanner.svelte`
5. New `PreferencesImportModal.svelte`

**Trade-offs:**
- Implementation effort: **Significant** (high risk of regressions)
- Best-practice alignment: **Canonical** (clean slate)
- Maintenance burden: **Complex** (more code to review, test)

---

## Recommendation: Approach A (Incremental Refactoring)

**Decisive reasons:**
1. **Lower risk**: Existing components work; refactoring in place preserves tested behavior
2. **Faster delivery**: No new abstractions to design; just update existing patterns
3. **Alignment with scope**: The acceptance criteria focus on UX consistency, not architectural purity

**What would flip the choice:**
- If a third step needed the same pattern → Approach B (extract RadioCardGroup)
- If current components had significant bugs → Approach C (rewrite)

---

## Detailed Implementation Plan (Approach A)

### Part A: Wizard Consistency

#### A1. Update Step Labels
**File:** `src/routes/activities/new/+page.svelte`
**Change:** Line 152
```typescript
// FROM:
const stepLabels = ['Students', 'Groups', 'Review'];
// TO:
const stepLabels = ['Add Your Students', 'Set Up Your Groups', 'Review & Create'];
```
**Effort:** Trivial

#### A2. Integrate Sheet Connection into Step 1
**File:** `src/routes/activities/new/+page.svelte`
**Changes:**
1. Remove floating sheet connector section (lines 414-481)
2. Add `sheetConnection` and `onSheetConnect` props to StepStudentsUnified
3. Move SheetConnector logic into StepStudentsUnified as third option

**File:** `src/lib/components/wizard/StepStudentsUnified.svelte`
**Changes:**
1. Add props: `onSheetConnect`, `onSheetDisconnect`
2. Add "Import from Google Sheets" as collapsible section (not just when logged in)
3. When not logged in: show "Sign in required" with auth flow
4. When connected: show inline SheetConnector or connection status
5. Pass sheetConnection to parent when connected

**Effort:** Moderate

#### A3. Standardize Selection Pattern
**File:** `src/lib/components/wizard/StepStudentsUnified.svelte`
**Changes:**
1. Convert accordion sections to radio-card pattern
2. Each option: radio indicator left, title, description, expansion area
3. Match visual treatment from StepGroupsUnified (border-2, rounded-xl, p-5)
4. Add expand/collapse animation consistency

**File:** `src/lib/components/wizard/StepGroupsUnified.svelte`
**Changes:**
1. Keep existing mode selector cards (already good pattern)
2. Update "How would you like to add groups?" to use same radio-card visual
3. Remove inline button-tab style, replace with full radio-card options

**Effort:** Moderate

#### A4. Standardize Navigation Footer
**File:** `src/routes/activities/new/+page.svelte`
**Changes:**
1. Unified footer layout for all steps
2. Footer structure: `[Cancel] ... [← Back] [Continue →]`
3. Step 1: Back hidden
4. Step 3: "Continue →" becomes "Create Groups"
5. Cancel always visible with confirmation when data entered

**Current state (lines 542-581):** Already mostly correct, just needs unification

**Effort:** Low

#### A5. Preferences Signpost (Already Done)
**File:** `src/lib/components/wizard/StepReviewGenerate.svelte`
**Status:** Already has signpost text at lines 247-251
**Change:** Verify wording matches AC A4

---

### Part B: Preferences Discovery Banner

#### B1-B3. Banner Component
**New File:** `src/lib/components/workspace/PreferencesPromptBanner.svelte`

```typescript
interface Props {
  activityId: string;
  onImportClick: () => void;
  onDismissSession: () => void;
  onDismissPermanent: () => void;
}
```

**Behavior:**
- Check localStorage for `groupwheel:prefs-banner-dismissed:{activityId}`
- If permanently dismissed, don't render
- "Maybe Later" dismisses for session only (component state)
- Close (×) dismisses permanently (localStorage)

**Effort:** Low

#### B4. Import Modal
**New File:** `src/lib/components/workspace/PreferencesImportModal.svelte`

**Structure:**
1. Modal wrapper (copy pattern from PublishSessionModal)
2. Reuse StepPreferences internals (import source toggle, paste area, sheet import, preview)
3. Pass students and groupNames from workspace context
4. On success: call preference-saving use case, close modal, emit success

**Props:**
```typescript
interface Props {
  isOpen: boolean;
  students: Student[];
  groupNames: string[];
  programId: string;
  sheetConnection: SheetConnection | null;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Effort:** Moderate (mostly composition of existing code)

#### B5. Integration in Workspace
**File:** `src/routes/activities/[id]/workspace/+page.svelte`

**Changes:**
1. Add state: `showPreferencesBanner`, `showPreferencesModal`
2. Compute banner visibility: `preferencesCount === 0 && !bannerPermanentlyDismissed`
3. Add PreferencesPromptBanner below existing guidance banner
4. Add PreferencesImportModal (closed by default)
5. On import success: reload preferences, hide banner
6. Add "Preferences imported. Regenerate to apply." indicator near Regenerate button

**Effort:** Moderate

---

## Implementation Order

**Recommended sequence (Part A before B):**

1. **A1: Step labels** - 15 min
2. **A4: Footer consistency** - 30 min
3. **A3: Selection pattern (StepStudentsUnified)** - 2-3 hours
4. **A3: Selection pattern (StepGroupsUnified)** - 1-2 hours
5. **A2: Sheet connection integration** - 1-2 hours
6. **A5: Signpost text verification** - 5 min

7. **B1-B3: PreferencesPromptBanner** - 1 hour
8. **B4: PreferencesImportModal** - 2-3 hours
9. **B5: Workspace integration** - 1-2 hours

**Total estimate:** ~10-14 hours of focused work

---

## Files to Create/Modify Summary

### Modified Files (8)
1. `src/routes/activities/new/+page.svelte`
2. `src/lib/components/wizard/StepStudentsUnified.svelte`
3. `src/lib/components/wizard/StepGroupsUnified.svelte`
4. `src/lib/components/wizard/StepReviewGenerate.svelte` (verify only)
5. `src/routes/activities/[id]/workspace/+page.svelte`

### New Files (2)
1. `src/lib/components/workspace/PreferencesPromptBanner.svelte`
2. `src/lib/components/workspace/PreferencesImportModal.svelte`

---

## Testing Considerations

1. **Manual testing paths:**
   - New user wizard flow (paste students, name groups, create)
   - Returning user wizard flow (reuse roster)
   - Google Sheets flow (connect, import students, import groups)
   - Workspace preferences banner (dismiss session, dismiss permanent, import)
   - Preference import modal (paste, sheet import, success/error states)

2. **Edge cases:**
   - No students → cannot proceed from step 1
   - No groups defined → cannot proceed from step 2
   - No activity name → cannot create
   - Preferences import with unknown students → warnings shown
   - Banner after preferences already exist → should not show

3. **Existing tests:**
   - Check e2e tests in `/e2e/` for wizard coverage
   - Add tests for new PreferencesPromptBanner and PreferencesImportModal

---

## Awaiting Approval

Please review this plan. Key decision points:

1. **Approach A vs B**: Is incremental refactoring acceptable, or do you want the shared RadioCardGroup abstraction?
2. **Implementation order**: Should Part B (banner) be done in parallel or after Part A?
3. **Scope questions**: Any acceptance criteria that need clarification?
