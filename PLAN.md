# Implementation Plan: US-6.3 & US-6.4 (UI Polish & Error Handling)

## Research Findings

### Current State Analysis

#### Button Patterns
- **No centralized Button component** exists - buttons are styled inline with Tailwind
- **Inconsistent sizing**: `px-4 py-2`, `px-6 py-4`, `px-3 py-1.5` used interchangeably
- **Inconsistent colors**: Primary uses coral, secondary uses teal, confirm dialogs use blue-600
- **Missing focus states** on some buttons - no `focus:ring-*` classes

Key files:
- `src/lib/components/editing/ConfirmDialog.svelte:36` - uses blue-600 (inconsistent)
- `src/lib/components/wizard/StepReviewGenerate.svelte:254-288` - coral with loading
- `src/lib/components/editing/EditingToolbar.svelte:123-131` - coral publish button

#### Loading States
- **Good patterns exist** in several components:
  - `SaveStatusIndicator.svelte` - comprehensive save lifecycle
  - `LoginButton.svelte` - inline spinner
  - `StepReviewGenerate.svelte` - button text swap during generation
- **No centralized Spinner component** - each component implements its own
- **No skeleton loaders** for content loading

#### Error Handling
- **Error messages utility exists**: `src/lib/utils/generationErrorMessages.ts`
- **No +error.svelte pages** - missing global error boundary
- **No 404 page** - activity not found shows inline error in `[id]/+page.svelte:149-154`
- **Validation pattern exists**: red border + text-red-600 message below field
- **Error banner pattern**: `GenerationErrorBanner.svelte` - amber background, retry button

#### Empty States
- **Good pattern in activities page**: `src/routes/activities/+page.svelte:240-263`
- **EmptyWorkspaceState component** exists at `src/lib/components/workspace/EmptyWorkspaceState.svelte`
- Pattern: dashed border, icon, heading, CTA button

#### Accessibility
- **ARIA usage is inconsistent** - some buttons have `aria-label`, many don't
- **Focus states**: Teal ring pattern (`focus:ring-2 focus:ring-teal`) used but not everywhere
- **Keyboard support**: Escape key handling in modals, but no skip links
- **Toggle switches**: Good `role="switch"` implementation in `SyncStatus.svelte`

#### Transitions/Animations
- Limited use of Svelte transitions - only 4 files use them
- CSS animations defined in `app.css`: `flash-move`, `preference-pulse`
- Tailwind `transition-*` classes used inconsistently

### Architecture Constraints

**Layer Impact:**
- US-6.3 (UI Polish) is purely **UI layer** - components and routes only
- US-6.4 (Error Handling) touches **UI layer** + potentially **application layer** for error types

**No new use cases needed** - these are presentation concerns.

**Anti-patterns to avoid:**
- Don't put business logic in UI components
- Don't bypass the existing error message utility
- Don't add error handling that belongs in use cases

---

## Proposed Approaches

### Approach A: Atomic Design System Components (Recommended)

**What it does differently:**
Create a small set of reusable UI primitives (`Button`, `Spinner`, `Alert`, `EmptyState`) in `src/lib/components/ui/`. Refactor existing components to use these. Add error boundaries and 404 page.

**Files created:**
- `src/lib/components/ui/Button.svelte` - unified button with variants
- `src/lib/components/ui/Spinner.svelte` - loading indicator
- `src/lib/components/ui/Alert.svelte` - error/warning/info messages
- `src/lib/components/ui/Skeleton.svelte` - content loading placeholder
- `src/routes/+error.svelte` - global error boundary
- `src/routes/activities/[id]/+error.svelte` - activity-specific 404

**Files modified (significant):**
- `src/lib/components/editing/ConfirmDialog.svelte` - use Button component
- `src/lib/components/auth/LoginButton.svelte` - use Button + Spinner
- `src/lib/components/wizard/StepReviewGenerate.svelte` - use Button
- `src/routes/activities/+page.svelte` - use Button, improve empty state
- `src/routes/activities/[id]/+page.svelte` - use Alert for errors
- Multiple files for button consistency updates

**Trade-offs:**
- Implementation effort: **Moderate** (10-15 files to update)
- Best-practice alignment: **Canonical** - proper component library approach
- Maintenance burden: **Simple** - centralized, DRY, easy to update globally

---

### Approach B: CSS-Only Standardization

**What it does differently:**
Define button/alert classes in `app.css` using Tailwind's `@layer components`. No new Svelte components - just apply consistent class names.

**Files created:**
- Update `src/app.css` with `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.alert`, `.alert-error` classes
- `src/routes/+error.svelte` - global error boundary
- `src/routes/activities/[id]/+error.svelte` - activity-specific 404

**Files modified:**
- All existing button usages (find/replace class names)

**Trade-offs:**
- Implementation effort: **Quick win** (less code to write)
- Best-practice alignment: **Acceptable** - works but not as composable
- Maintenance burden: **Manageable** - CSS classes are discoverable but not type-safe

---

### Approach C: Minimal Targeted Fixes

**What it does differently:**
Fix the most egregious issues without creating new infrastructure. Standardize colors, add missing focus states, add error pages, but keep inline styling.

**Files created:**
- `src/routes/+error.svelte` - global error boundary
- `src/routes/activities/[id]/+error.svelte` - activity-specific 404

**Files modified:**
- Individual fixes across ~20 files
- Update `ConfirmDialog.svelte` to use coral instead of blue
- Add missing `aria-label` attributes
- Add missing `focus:ring-*` classes

**Trade-offs:**
- Implementation effort: **Quick win** (but scattered changes)
- Best-practice alignment: **Technical debt** - doesn't address root cause
- Maintenance burden: **Complex** - no single source of truth for styles

---

## Recommendation

**I recommend Approach A: Atomic Design System Components.**

**Decisive reasons:**
1. **Single source of truth** - Button variants, loading states, and error displays are defined once and used everywhere. Future style updates propagate automatically.
2. **Type safety** - Svelte components with `$props` provide autocomplete and validation for variant options, reducing bugs.

**What would flip the choice:**
- If you need to ship within hours, Approach C is faster
- If you want minimal component coupling, Approach B works without adding new imports

---

## Implementation Plan (Approach A)

### Phase 1: UI Primitives

1. **Create Button.svelte**
   - Props: `variant` (primary/secondary/danger/ghost), `size` (sm/md/lg), `loading`, `disabled`
   - Focus ring: `focus:ring-2 focus:ring-offset-2 focus:ring-{color}`
   - Handle loading spinner internally

2. **Create Spinner.svelte**
   - Props: `size` (sm/md/lg), `color` (inherit/white/teal)
   - Reusable loading indicator

3. **Create Alert.svelte**
   - Props: `variant` (error/warning/info/success), `title`, `dismissible`
   - Consistent error/warning display

4. **Create Skeleton.svelte**
   - Props: `lines`, `width`, `height`
   - Content loading placeholder

### Phase 2: Error Boundaries & 404

5. **Create `src/routes/+error.svelte`**
   - Handle unexpected errors: "Something went wrong. Please refresh."
   - Link to dashboard

6. **Create `src/routes/activities/[id]/+error.svelte`**
   - Handle 404: "Activity not found"
   - Link to activities list

### Phase 3: Refactor Existing Components

7. **Update ConfirmDialog.svelte** - use Button component
8. **Update LoginButton.svelte** - use Button + Spinner
9. **Update EditingToolbar.svelte** - use Button variants
10. **Update wizard step components** - consistent button usage
11. **Update activities page** - consistent buttons, improved empty state

### Phase 4: Accessibility Audit

12. **Add missing aria-labels** to icon-only buttons
13. **Ensure focus states** are visible on all interactive elements
14. **Add transitions** to modals (fade backdrop, scale dialog)

### Phase 5: Testing & Polish

15. **Add Svelte component tests** for Button, Alert, Spinner
16. **Verify no unhandled promise rejections** in console
17. **Test keyboard navigation** across all pages

---

## Verification Checklist

### US-6.3: UI Polish and Consistency
- [ ] Consistent button styles (primary, secondary, danger) across all pages
- [ ] Consistent spacing and typography scale
- [ ] Loading states on all async operations (spinners, skeletons)
- [ ] Error states with clear, helpful messages
- [ ] Empty states with guidance and CTAs
- [ ] Smooth transitions/animations (not jarky or missing)
- [ ] Focus states visible for keyboard navigation
- [ ] ARIA labels on interactive elements

### US-6.4: Error Handling and Edge Cases
- [ ] Network errors: "You're offline. Changes will sync when reconnected."
- [ ] Validation errors: Specific field highlighted with message
- [ ] 404 pages: "Activity not found" with link to Dashboard
- [ ] Unexpected errors: "Something went wrong. Please refresh the page."
- [ ] No unhandled promise rejections in console
- [ ] Error boundary catches component crashes gracefully

---

## Questions for Clarification

1. **Network offline handling**: The sync feature exists but offline detection isn't prominent. Should we add a global offline banner, or is sync status in the header sufficient?

2. **Transition animations**: Preference for Svelte transitions (`transition:fade`, `transition:scale`) vs CSS animations? Svelte transitions are more idiomatic but add bundle size.

3. **Button variant colors**: Currently coral=primary, teal=secondary. Should "danger" use red-600, or stay in the coral family?

4. **Scope for Phase 3**: Should we refactor ALL buttons in one pass, or prioritize high-traffic pages (activities list, workspace, wizard)?
