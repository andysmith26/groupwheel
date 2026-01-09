# Plan: Track Google Form Responses Feature

## Problem Summary

Teachers using Google Forms to collect club preferences need to see which students haven't submitted. Currently they must manually cross-reference roster vs form responses spreadsheets.

## Research Findings

### Existing Patterns (files to reuse)

1. **Google Sheets Integration**
   - `src/lib/infrastructure/sheets/GoogleSheetsAdapter.ts` - fetches sheet metadata and tab data
   - `src/lib/application/ports/GoogleSheetsService.ts` - port interface with error types
   - `src/lib/application/useCases/connectGoogleSheet.ts` - validates URL, fetches metadata
   - `src/lib/application/useCases/importFromSheetTab.ts` - fetches tab data

2. **UI Components**
   - `src/lib/components/import/SheetConnector.svelte` - URL input, connects to sheet
   - `src/lib/components/import/TabSelector.svelte` - dropdown to select tab, shows preview

3. **Choice Extraction**
   - `src/lib/utils/matrixPreferenceParser.ts:179-195` - `extractChoiceRank()` parses "1st Choice", "2nd Choice", etc.
   - Already handles the exact format needed

4. **Auth & Storage**
   - Auth available via `getAppEnvContext()` → `env.authService`
   - `LocalStorageAdapter` for persistence (direct localStorage also used in `googleOAuth.ts`)

5. **Route Pattern**
   - Header nav defined in `src/routes/+layout.svelte:114-127`
   - Standalone pages at `src/routes/<path>/+page.svelte`

### Architecture Constraints

Per `docs/ARCHITECTURE.md`:
- Domain layer must be pure (no framework code)
- Use cases take `deps` object, return `Result<Success, Error>`
- UI calls use cases via facade (`appEnvUseCases.ts`)
- Components get context via `getAppEnvContext()`

**Key decision**: This feature is standalone (out of scope: connecting to Activity/Program entities). It should be a lightweight utility page, not a full domain feature.

---

## Approaches

### Approach A: Minimal UI-Only (Recommended)

**What it does**: All logic lives in the page component. No new use cases, ports, or domain types. Uses existing `connectGoogleSheet` and `importFromSheetTab` use cases.

**Files created/modified**:
- `src/routes/track-responses/+page.svelte` (new) - main page with all logic
- `src/routes/+layout.svelte` - add nav link
- `src/lib/utils/responseTracker.ts` (new) - pure utility functions for matching/extraction

**Why this approach**:
- Feature is standalone and explicitly out of scope for domain integration
- Matching roster↔responses and extracting choices are pure transformations (no I/O)
- Existing use cases (`connectGoogleSheet`, `importFromSheetTab`) handle all API calls
- No new ports or adapters needed

**Trade-offs**:
- Implementation effort: Quick
- Best-practice alignment: Acceptable (logic in utils, not domain, but feature is explicitly standalone)
- Maintenance: Simple

---

### Approach B: Full Hexagonal (Use Case Layer)

**What it does**: Create new use case `trackFormResponses` that encapsulates all logic.

**Files created/modified**:
- `src/lib/application/useCases/trackFormResponses.ts` (new)
- `src/lib/services/appEnvUseCases.ts` - add facade helper
- `src/routes/track-responses/+page.svelte` (new)
- `src/routes/+layout.svelte` - add nav link

**Trade-offs**:
- Implementation effort: Moderate
- Best-practice alignment: Canonical (everything in use cases)
- Maintenance: More code to maintain for a standalone utility

**Why not**: Over-engineering for a feature explicitly scoped as standalone. Use cases are for domain operations; this is a utility.

---

### Approach C: Domain-Integrated

**What it does**: Create domain types (`ResponseTrackingSession`, `TrackedStudent`) and integrate with Program/Activity entities.

**Trade-offs**:
- Implementation effort: Significant
- Best-practice alignment: Over-engineered (violates "out of scope" requirement)
- Maintenance: Complex, creates coupling that was explicitly excluded

**Why not**: Directly contradicts the "out of scope" requirement to NOT connect to Activity/Program entities.

---

## Recommendation

**Approach A: Minimal UI-Only**

**Reasons**:
1. Requirements explicitly exclude domain integration ("not tied to activities")
2. Existing use cases handle all Sheets API work; only new code is UI + pure transformations
3. Simplest approach that meets all acceptance criteria

**What would change this**: If future requirements need to persist tracking sessions or link to activities, Approach B would be appropriate.

---

## Implementation Plan (Approach A)

### Step 1: Create utility functions
File: `src/lib/utils/responseTracker.ts`

Functions:
- `matchRosterToResponses(roster, responses, emailColumnIndex)` - returns { submitted, notSubmitted, cantTrack }
- `extractChoices(row, headers)` - returns { studentName, email, choices: string[] } using existing pattern from matrixPreferenceParser
- `findEmailColumn(headers)` - auto-detect column by header name (case-insensitive "email")
- `deduplicateResponses(rows)` - keep later row for same email

### Step 2: Create the page
File: `src/routes/track-responses/+page.svelte`

UI sections:
1. **Auth guard** - show "Sign in required" if not authenticated
2. **Sheet connection** - reuse SheetConnector component
3. **Tab selectors** - two TabSelector components (roster tab, responses tab)
4. **Results display** - three lists: Not Submitted, Submitted (with choices), Can't Track
5. **Auto-refresh** - `setInterval` every 30s + manual refresh button
6. **Persistence** - save/load sheet ID and tab selections to localStorage

State shape:
```typescript
interface TrackingState {
  spreadsheetId: string | null;
  rosterTabGid: string | null;
  responsesTabGid: string | null;
}
```

localStorage key: `groupwheel_response_tracker`

### Step 3: Add nav link
File: `src/routes/+layout.svelte`

Add link in header nav between "Activities" and the settings button.

### Step 4: Tests
- Unit tests for utility functions in `src/lib/utils/responseTracker.test.ts`
- Test cases: email matching (case-insensitive), duplicate handling, choice extraction, empty email handling

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/utils/responseTracker.ts` | Create | Pure matching/extraction utilities |
| `src/lib/utils/responseTracker.test.ts` | Create | Unit tests |
| `src/routes/track-responses/+page.svelte` | Create | Main page component |
| `src/routes/+layout.svelte` | Modify | Add nav link (~5 lines) |

---

## Acceptance Criteria Mapping

| Requirement | Implementation |
|-------------|----------------|
| New page at /track-responses | `src/routes/track-responses/+page.svelte` |
| Accessible via header link | Nav link in `+layout.svelte` |
| User must be authenticated | Auth check using `isAuthenticated(env)` |
| Browse Google Drive / select spreadsheet | Reuse `SheetConnector` component |
| Select roster and responses tabs | Two `TabSelector` components |
| Match by email | `matchRosterToResponses()` utility |
| Display Not Submitted list | Component renders `notSubmitted` array |
| Display Submitted list with choices | Component renders `submitted` array with choices |
| Extract "1st Choice", "2nd Choice" | `extractChoices()` using existing parser patterns |
| Duplicate handling (use later row) | `deduplicateResponses()` utility |
| Can't Track bucket (missing email) | `cantTrack` array from matcher |
| Persist sheet ID to localStorage | Save `TrackingState` to localStorage |
| Auto-refresh every 30s | `setInterval` + refresh function |
| Manual refresh button | Button calls refresh function |
| Return to page loads previous sheet | `onMount` reads localStorage and auto-loads |
