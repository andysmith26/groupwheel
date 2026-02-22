# Plan: Cross-Activity Student Identity Tracking

## Problem Statement

Teachers need to track the same student across multiple activities. Currently:

- Each import creates new student records with unique UUIDs
- No matching or deduplication logic exists
- Student history (preferences, groupings, observations) is fragmented per-activity
- No unified view of a student's complete history

### Requirements

1. **Identity matching on import**: When importing students, detect potential matches with existing students and let teachers confirm/reject
2. **Handle scale**: Support matching against 75+ existing students efficiently
3. **Preserve complete history**: All preferences, groupings, and observations must link back to the canonical student identity
4. **Teacher UX**: Provide a comprehensive student profile view showing all historical data

---

## Step 1: Research Findings

### Current Student Model

**File**: `src/lib/domain/student.ts:17-52`

```typescript
interface Student {
  id: string; // Currently UUID per import
  firstName: string;
  lastName?: string;
  gradeLevel?: string;
  gender?: string;
  meta?: Record<string, unknown>;
}
```

**Key insight**: Students are identified purely by `id`. There's no built-in concept of identity across imports.

### Current Import Flow

**File**: `src/lib/application/useCases/importRosterWithMapping.ts:188`

- Generates fresh UUID for each imported student via `idGenerator.generateId()`
- No check against existing students
- No matching/merging logic

### Existing History Infrastructure

| Entity        | Links to Student   | File                                  |
| ------------- | ------------------ | ------------------------------------- |
| `Placement`   | `studentId`        | `src/lib/domain/placement.ts:20-51`   |
| `Preference`  | `studentId`        | `src/lib/domain/preference.ts:95-111` |
| `Observation` | Indirect via group | `src/lib/domain/observation.ts:21-43` |

### Existing History Use Cases

- `getStudentPlacementHistory.ts` - Retrieves all placements for a student
- `getPairingHistory.ts` - Tracks pairing frequency between students
- `listStudentStats.ts` - Aggregated stats per student

**Key finding**: The history infrastructure is solid but assumes stable student IDs. The problem is purely at the identity/import layer.

---

## Step 2: Architecture Constraints

### Layers Affected

| Layer              | Impact                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Domain**         | New `StudentIdentity` entity or extend `Student` with `canonicalId`                  |
| **Application**    | New use cases: `findMatchingStudents`, `mergeStudentIdentities`, `getStudentProfile` |
| **Infrastructure** | Extend `StudentRepository` with search/matching methods                              |
| **UI**             | New matching UI during import, new student profile page                              |

### Anti-patterns to Avoid

- Don't put matching logic in UI components (belongs in use case)
- Don't call repository directly from UI for matching queries
- Don't create circular dependencies between use cases

### Key Architectural Decision

**Student identity should be managed at the domain level**, not through UI workarounds. Two approaches:

1. **Canonical ID pattern**: Add `canonicalId` field to Student; multiple import records can point to same canonical identity
2. **Merge pattern**: Merge student records into one, updating all historical references

---

## Step 3: Approaches

### Approach A: Canonical ID with Identity Linking

**What it does differently**: Introduces a separate `StudentIdentity` concept. Each imported `Student` record has a `canonicalId` pointing to the shared identity. History queries use `canonicalId`.

**Domain changes**:

```typescript
// New entity
interface StudentIdentity {
  id: string; // The canonical ID
  displayName: string; // Preferred display name
  knownNames: string[]; // All variants seen
  createdAt: Date;
}

// Extended Student
interface Student {
  id: string; // Import-specific ID
  canonicalId: string; // Links to StudentIdentity
  firstName: string;
  // ... rest unchanged
}
```

**Files created/modified**:

- `src/lib/domain/studentIdentity.ts` (NEW)
- `src/lib/domain/student.ts` (add `canonicalId` field)
- `src/lib/application/ports/StudentIdentityRepository.ts` (NEW)
- `src/lib/application/useCases/findMatchingStudents.ts` (NEW)
- `src/lib/application/useCases/linkStudentToIdentity.ts` (NEW)
- `src/lib/application/useCases/getStudentProfile.ts` (NEW)
- `src/lib/infrastructure/repositories/*/StudentIdentityRepository.ts` (NEW)
- `src/lib/components/import/StudentMatchingModal.svelte` (NEW)
- `src/routes/students/[id]/+page.svelte` (NEW)

**Trade-offs**:

- Implementation effort: **Significant** - new entity, new repository, schema migration
- Best-practice alignment: **Canonical** - clean separation of import vs identity
- Maintenance burden: **Manageable** - clear model but two-entity complexity

---

### Approach B: Student Merge with Reference Rewriting

**What it does differently**: When a match is confirmed, merge student records by rewriting all historical references to point to the canonical student ID. Delete the duplicate record.

**Domain changes**:

```typescript
// No new entities. Student unchanged.
// New use case handles the merge operation.
```

**Files created/modified**:

- `src/lib/application/useCases/findMatchingStudents.ts` (NEW)
- `src/lib/application/useCases/mergeStudents.ts` (NEW) - rewrites Placement.studentId, Preference.studentId, etc.
- `src/lib/application/useCases/getStudentProfile.ts` (NEW)
- `src/lib/application/ports/StudentRepository.ts` (extend with search methods)
- `src/lib/components/import/StudentMatchingModal.svelte` (NEW)
- `src/routes/students/[id]/+page.svelte` (NEW)

**Trade-offs**:

- Implementation effort: **Moderate** - no new entities, but reference rewriting is complex
- Best-practice alignment: **Acceptable** - simple model but destructive merge operation
- Maintenance burden: **Complex** - merge operation must update many tables atomically

---

### Approach C: Soft Matching with Manual Identity Management

**What it does differently**: Adds a `linkedStudentIds` field to Student. Teachers explicitly link students as "the same person" via a UI action. History queries aggregate across linked IDs.

**Domain changes**:

```typescript
interface Student {
  id: string;
  firstName: string;
  linkedStudentIds?: string[]; // Other IDs that are "the same person"
  // ... rest unchanged
}
```

**Files created/modified**:

- `src/lib/domain/student.ts` (add `linkedStudentIds`)
- `src/lib/application/useCases/findMatchingStudents.ts` (NEW)
- `src/lib/application/useCases/linkStudents.ts` (NEW)
- `src/lib/application/useCases/getStudentProfile.ts` (NEW) - aggregates across linked IDs
- `src/lib/application/ports/StudentRepository.ts` (extend with search)
- `src/lib/components/import/StudentMatchingModal.svelte` (NEW)
- `src/routes/students/[id]/+page.svelte` (NEW)

**Trade-offs**:

- Implementation effort: **Moderate** - simpler than A, cleaner than B
- Best-practice alignment: **Acceptable** - lightweight but potential for orphaned links
- Maintenance burden: **Manageable** - queries need to handle linked IDs

---

## Step 4: Recommendation

**I recommend Approach A: Canonical ID with Identity Linking.**

### Decisive Reasons

1. **Clean separation of concerns**: Import records remain immutable audit trails. Identity is a first-class concept that teachers can manage explicitly.

2. **Future-proof**: Supports advanced scenarios like:
   - Same student in multiple schools
   - Name changes over time
   - Gradual identity discovery (link students later, not just at import)

3. **Predictable queries**: All history queries use `canonicalId` directly, no need for recursive linked-ID resolution.

### What Would Flip the Choice

- If the database already had thousands of student records needing migration → Approach C would be less disruptive
- If simplicity were the absolute priority and identity linking is rare → Approach C is lighter weight
- If data integrity concerns outweighed complexity → Approach B guarantees single source of truth

---

## Step 5: Detailed Implementation Plan

### Phase 1: Domain & Infrastructure Foundation

1. **Create `StudentIdentity` entity** (`src/lib/domain/studentIdentity.ts`)

   ```typescript
   interface StudentIdentity {
     id: string;
     displayName: string;
     knownVariants: { firstName: string; lastName?: string; source: string }[];
     createdAt: Date;
     userId?: string; // Multi-tenant
   }
   ```

2. **Extend `Student` entity** (`src/lib/domain/student.ts`)
   - Add `canonicalId?: string` field
   - Backward compatible: existing students without `canonicalId` use their own `id`

3. **Create `StudentIdentityRepository` port** (`src/lib/application/ports/StudentIdentityRepository.ts`)

   ```typescript
   interface StudentIdentityRepository {
     getById(id: string): Promise<StudentIdentity | null>;
     search(query: { firstName?: string; lastName?: string }): Promise<StudentIdentity[]>;
     save(identity: StudentIdentity): Promise<void>;
     listAll(userId?: string): Promise<StudentIdentity[]>;
   }
   ```

4. **Extend `StudentRepository` port** (`src/lib/application/ports/StudentRepository.ts`)
   - Add `listByCanonicalId(canonicalId: string): Promise<Student[]>`
   - Add `searchByName(firstName: string, lastName?: string): Promise<Student[]>`

5. **Implement IndexedDB repositories**
   - `IndexedDbStudentIdentityRepository.ts`
   - Add new store `'studentIdentities'` to `db.ts`
   - Add index on `canonicalId` to students store

### Phase 2: Matching Use Cases

6. **Create `findMatchingStudents` use case** (`src/lib/application/useCases/findMatchingStudents.ts`)

   ```typescript
   interface MatchCandidate {
     identity: StudentIdentity;
     matchScore: number; // 0-1 confidence
     matchReason: string; // "Exact name match", "Similar first name", etc.
   }

   async function findMatchingStudents(
     deps: { studentIdentityRepo; studentRepo },
     input: { firstName: string; lastName?: string; limit?: number }
   ): Promise<MatchCandidate[]>;
   ```

   Matching logic:
   - Exact first+last name match → score 1.0
   - Exact first name, similar last → score 0.8
   - Similar first name (Levenshtein ≤ 2) → score 0.5
   - Return top N candidates sorted by score

7. **Create `createOrLinkStudent` use case** (`src/lib/application/useCases/createOrLinkStudent.ts`)
   - If teacher confirms match: link new student record to existing identity
   - If teacher says "new person": create new identity
   - If teacher skips: create new identity (can link later)

8. **Create `getStudentProfile` use case** (`src/lib/application/useCases/getStudentProfile.ts`)
   ```typescript
   interface StudentProfile {
     identity: StudentIdentity;
     studentRecords: Student[]; // All import instances
     placementHistory: PlacementWithSession[];
     preferences: Preference[];
     observations: Observation[];
     pairingStats: { studentId: string; count: number }[];
   }
   ```

### Phase 3: Import Integration

9. **Modify `importRosterWithMapping` use case**
   - After parsing, for each student:
     - Call `findMatchingStudents`
     - If matches found: collect for batch review
     - If no matches: auto-create new identity
   - Return list of students needing review

10. **Create batch matching UI** (`src/lib/components/import/StudentMatchingReview.svelte`)
    - Shows list of imported students with potential matches
    - For each: "Same as [existing]" / "New person" / "Skip (decide later)"
    - Handles 75+ students efficiently with virtualized list
    - Bulk actions: "Mark all remaining as new"

### Phase 4: Student Profile Page

11. **Create student profile route** (`src/routes/students/[id]/+page.svelte`)
    - Shows identity info
    - Lists all import instances (which pools/activities)
    - Shows placement history timeline
    - Shows preference history
    - Shows observations (if any involve this student's groups)
    - Shows pairing frequency with other students

12. **Add navigation to profile**
    - From `StudentInfoTooltip.svelte`: "View full profile →"
    - From activity workspace: click student name opens popover with profile link

### Phase 5: Analytics Integration

13. **Update history use cases** to use `canonicalId`
    - `getStudentPlacementHistory`: query by canonicalId
    - `getPairingHistory`: use canonicalIds for accurate cross-activity tracking
    - `listStudentStats`: aggregate by canonicalId

14. **Add cross-activity analytics** (`src/routes/analytics/students/+page.svelte`)
    - List all student identities
    - Sort by: total placements, first-choice %, activity count
    - Click to view profile

---

## Migration Strategy

### For Existing Data

1. **Backward compatible**: `canonicalId` is optional
2. **Auto-migration**: When accessing a student without `canonicalId`, treat their `id` as the canonical ID
3. **Lazy linking**: Teachers can link existing students via the profile page

### Database Schema

Add to `db.ts`:

```typescript
db.version(7).stores({
  // ... existing stores
  studentIdentities: 'id, userId',
  students: 'id, canonicalId' // Add canonicalId index
});
```

---

## UI/UX Design Notes

### Matching Review Modal (75 students)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Review Student Matches                                    23 of 75  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Imported: "Alex Chen"                                               │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ● Same as "Alex Chen" (Grade 5, Mrs. Johnson's class)           │ │
│ │   ↳ 12 previous groupings, 3 activities                         │ │
│ │                                                                 │ │
│ │ ○ Same as "Alexander Chen" (Grade 5, Morning Reading)           │ │
│ │   ↳ 4 previous groupings, 1 activity                            │ │
│ │                                                                 │ │
│ │ ○ This is a new person                                          │ │
│ │                                                                 │ │
│ │ ○ Decide later                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [← Previous]  [Skip all remaining (new)]  [Confirm & Next →]       │
└─────────────────────────────────────────────────────────────────────┘
```

### Student Profile Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back                                                              │
│                                                                     │
│ Alex Chen                                              [Edit name]  │
│ Grade 5 • 3 activities • 15 groupings                               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Grouping History                                                    │
│ ─────────────────────────────────────────────────────────────────── │
│ Jan 15  Morning Reading    Table 3    1st choice ✓                  │
│ Jan 14  Morning Reading    Table 1    2nd choice                    │
│ Jan 10  Math Groups        Blue Team  (no preference)               │
│ Jan 8   Morning Reading    Table 4    1st choice ✓                  │
│ ...                                                                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Frequent Groupmates                                                 │
│ ─────────────────────────────────────────────────────────────────── │
│ Jordan Kim       8 times                                            │
│ Sam Martinez     6 times                                            │
│ Riley Johnson    4 times                                            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Preferences Expressed                                               │
│ ─────────────────────────────────────────────────────────────────── │
│ Morning Reading: Table 3 (#1), Table 1 (#2), Table 4 (#3)           │
│ Club Day: Art Club (#1), Drama (#2), Coding (#3)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files Summary

### New Files

| File                                                                                  | Purpose                 |
| ------------------------------------------------------------------------------------- | ----------------------- |
| `src/lib/domain/studentIdentity.ts`                                                   | StudentIdentity entity  |
| `src/lib/application/ports/StudentIdentityRepository.ts`                              | Repository interface    |
| `src/lib/application/useCases/findMatchingStudents.ts`                                | Name matching logic     |
| `src/lib/application/useCases/createOrLinkStudent.ts`                                 | Identity linking        |
| `src/lib/application/useCases/getStudentProfile.ts`                                   | Aggregated profile data |
| `src/lib/infrastructure/repositories/indexedDb/IndexedDbStudentIdentityRepository.ts` | Persistence             |
| `src/lib/infrastructure/repositories/inMemory/InMemoryStudentIdentityRepository.ts`   | Testing                 |
| `src/lib/components/import/StudentMatchingReview.svelte`                              | Batch matching UI       |
| `src/routes/students/[id]/+page.svelte`                                               | Profile page            |

### Modified Files

| File                                                      | Changes                       |
| --------------------------------------------------------- | ----------------------------- |
| `src/lib/domain/student.ts`                               | Add `canonicalId` field       |
| `src/lib/application/ports/StudentRepository.ts`          | Add search methods            |
| `src/lib/application/useCases/importRosterWithMapping.ts` | Integrate matching            |
| `src/lib/infrastructure/repositories/indexedDb/db.ts`     | Add new store & indexes       |
| `src/lib/infrastructure/inMemoryEnvironment.ts`           | Add StudentIdentityRepository |
| `src/lib/services/appEnvUseCases.ts`                      | Add facade methods            |
| `src/lib/components/editing/StudentInfoTooltip.svelte`    | Add profile link              |

---

## Testing Strategy

1. **Unit tests**: `findMatchingStudents` scoring logic
2. **Unit tests**: `createOrLinkStudent` identity creation/linking
3. **Integration tests**: Import flow with matching
4. **E2E test**: Import → match → verify linked history
5. **E2E test**: Student profile shows cross-activity data

---

## Design Decisions (Confirmed)

1. **Always confirm, but make bulk easy**: Even exact matches require confirmation, but the UI must handle 75 students efficiently. Bulk "confirm all high-confidence matches" action is essential.

2. **Post-hoc merge**: Out of scope for now. Teachers link at import time only.

3. **Delete vs archive**: Handle separately. True delete removes PII and shows "identity removed" placeholder in historical reports. Complex topic with multiple delete reasons - defer detailed design.

4. **Cross-activity visibility**: Default (students visible across activities).

---

## Key Scenario: Mid-Year Re-Import

Teacher imports roster at start of year (75 students, all new). Three months later, imports updated roster:

- Some students left (not in new import)
- Some students joined (new names)
- Some students have name changes (hyphenated ↔ single, spelling, nicknames, or completely different)

**The system must**:

1. Auto-detect high-confidence matches → present for bulk confirmation
2. Suggest possible matches for ambiguous cases → teacher confirms or rejects
3. Flag unmatched imports → teacher selects existing or marks as new
4. Flag existing students not in import → teacher confirms "left" or keeps active

---

## Refined Matching Algorithm

### Match Scoring

```typescript
interface MatchResult {
  importedStudent: { firstName: string; lastName?: string; rowIndex: number };
  bestMatch: StudentIdentity | null;
  allCandidates: MatchCandidate[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

interface MatchCandidate {
  identity: StudentIdentity;
  score: number; // 0-100
  reasons: string[]; // ["Exact first name", "Similar last name (Smith → Smyth)"]
}
```

### Scoring Rules

| Condition                                                  | Score Contribution     |
| ---------------------------------------------------------- | ---------------------- |
| Exact first + last name                                    | +100 (HIGH confidence) |
| Exact first name                                           | +50                    |
| Similar first name (Levenshtein ≤ 2)                       | +30                    |
| Similar first name (nickname match: "Alex" ↔ "Alexander") | +40                    |
| Exact last name                                            | +30                    |
| Similar last name (Levenshtein ≤ 2)                        | +20                    |
| Hyphen variation ("Smith-Jones" ↔ "Smith" or "Jones")     | +25                    |
| Same grade level                                           | +10                    |

### Confidence Thresholds

- **HIGH** (≥90): Exact or near-exact match. Present for bulk confirmation.
- **MEDIUM** (60-89): Likely match but needs individual review.
- **LOW** (30-59): Possible match, show as suggestion.
- **NONE** (<30): No reasonable match found, assume new student.

### Nickname Database

Common nickname mappings (extensible):

```typescript
const NICKNAMES: Record<string, string[]> = {
  alexander: ['alex', 'xander', 'lex'],
  elizabeth: ['liz', 'lizzy', 'beth', 'eliza'],
  william: ['will', 'bill', 'billy', 'liam'],
  katherine: ['kate', 'katie', 'kathy', 'kat'],
  michael: ['mike', 'mikey'],
  jennifer: ['jen', 'jenny'],
  christopher: ['chris'],
  nicholas: ['nick', 'nicky'],
  benjamin: ['ben', 'benji'],
  jonathan: ['jon', 'johnny']
  // ... expand as needed
};
```

---

## Refined Matching UX

### Three-Panel Review Interface

For 75 students, a sequential "one at a time" flow is too slow. Instead, use a three-panel approach:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Match Imported Students                                        75 imported  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐ │
│ │ HIGH CONFIDENCE │ │ NEEDS REVIEW            │ │ NEW STUDENTS            │ │
│ │ 68 students     │ │ 4 students              │ │ 3 students              │ │
│ │                 │ │                         │ │                         │ │
│ │ ☑ Alex Chen     │ │ ○ "Sam Smith"           │ │ ✓ Taylor Wong           │ │
│ │   → Alex Chen   │ │   → Samuel Smith? (85)  │ │   (no matches)          │ │
│ │ ☑ Jordan Kim    │ │   → Samantha Smith?(72) │ │ ✓ Casey Johnson         │ │
│ │   → Jordan Kim  │ │   → New student         │ │   (no matches)          │ │
│ │ ☑ Riley Jones   │ │                         │ │ ✓ Morgan Lee            │ │
│ │   → Riley Jones │ │ ○ "Chris Taylor"        │ │   (no matches)          │ │
│ │ ...             │ │   → Christina Taylor?   │ │                         │ │
│ │                 │ │   → Christopher Taylor? │ │                         │ │
│ │ [Select All]    │ │   → New student         │ │                         │ │
│ │ [Deselect All]  │ │                         │ │                         │ │
│ └─────────────────┘ │ ...                     │ │                         │ │
│                     └─────────────────────────┘ └─────────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⚠ 2 existing students not in this import: Jamie Park, Drew Martinez        │
│   [Keep them active]  [Mark as left]  [Review individually]                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                              [Cancel]  [Confirm & Import]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Panel 1: High Confidence (Bulk Confirm)

- Pre-checked by default
- Teacher scans list, unchecks any that look wrong (rare)
- "Select All" / "Deselect All" for quick adjustments
- Clicking a row expands to show match details + alternatives

### Panel 2: Needs Review (Individual Decisions)

- Radio buttons for each imported student
- Shows all candidates with scores
- "New student" always an option
- Must resolve all before import

### Panel 3: New Students (Informational)

- Students with no matches (NONE confidence)
- Pre-marked as "create new identity"
- Teacher can click to search for existing (if they know it's a name change)

### Bottom Bar: Missing Students

- Existing students in this pool not present in import
- Quick actions: "Keep active" (maybe absent today), "Mark as left" (remove from pool but preserve history)
- "Review individually" for edge cases

---

## Updated Implementation Phases

### Phase 1: Domain & Infrastructure (unchanged)

### Phase 2: Matching Algorithm

1. **Implement scoring logic** with nickname database
2. **Create `matchImportedStudents` use case**
   ```typescript
   async function matchImportedStudents(
     deps: { studentIdentityRepo; studentRepo },
     input: {
       importedStudents: { firstName: string; lastName?: string }[];
       poolId: string; // To check for "missing" students
     }
   ): Promise<{
     highConfidence: MatchResult[];
     needsReview: MatchResult[];
     newStudents: MatchResult[];
     missingFromImport: StudentIdentity[];
   }>;
   ```

### Phase 3: Matching UI

1. **Create `StudentMatchingReview.svelte`** - Three-panel interface
2. **Virtualized lists** for performance with 75+ students
3. **Keyboard navigation** for power users

### Phase 4-5: (unchanged - Profile page & Analytics)

---

## Ready for Implementation

Awaiting approval to proceed.
