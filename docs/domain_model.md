# Turntable Domain Model (reduced MVP + target vocabulary)

_Last updated: 2025-12-13_

This conceptual domain model defines the canonical nouns and relationships for Turntable. It reflects the reduced MVP decisions (explicitly annotated) while preserving vocabulary for planned and future features so migration and refactors are straightforward.

---

## Status legend

- **MVP** — In scope for the reduced MVP (✅ implemented as of Dec 2025).
- **Planned** — Near‑term work, after MVP.
- **Future** — Long‑term/aspirational.

> Note: The MVP is now **fully implemented** with a clean hexagonal architecture (domain/application/infrastructure layers). All core entities (Pool, Program, Scenario, Student, Staff, Preference, Group) are implemented in `src/lib/domain/`. The unified "Create Groups" wizard provides the user-facing interface.

---

## 1. People & Organization

### 1.1 School

- `id: string`
- `name: string`  
  **Status:** Planned (near-term support for multi-school metadata; will be present in models and DB as simple `schoolId` fields).

### 1.2 Student

- `id: string`
- `firstName: string`
- `lastName: string`
- `gradeLevel?: string`  
  **Status:** Implemented (MVP)

### 1.3 Staff

- `id: string`
- `name: string`
- `roles: ('TEACHER' | 'ADMIN' | 'COUNSELOR' | 'STAFF' | 'CLUB_LEADER' | ... )[]`  
  **Status:** Implemented (MVP)

---

## 2. Pools & Membership (reduced MVP)

### 2.1 Pool (MVP)

A Pool is a named roster/cohort created via CSV import. In MVP the Pool contains a simple memberIds list derived from the CSV. We deliberately keep membership management minimal in MVP (no EnrollmentRecords). Pools are the canonical source Programs reference for participants.

- `id: string`
- `schoolId?: string` _(optional in MVP; recommended for multi-school)_
- `name: string`
- `type: 'SCHOOL' | 'GRADE' | 'CLASS' | 'TRIP' | 'CUSTOM'`
- `memberIds: string[]` _(derived from CSV import; edits via UI/replace import)_
- `primaryStaffOwnerId?: string`
- `ownerStaffIds?: string[]`
- `timeSpan?: { start: Date; end?: Date }`
- `status: 'ACTIVE' | 'ARCHIVED'`
- `source?: 'IMPORT' | 'MANUAL'`
- `parentPoolId?: string` _(kept for future hierarchical support but not used in MVP)_

**Status:** MVP

> Implementation note (MVP): Pools are writable via CSV/TSV import and via basic UI edits (add/remove). Historical temporal enrollment is not tracked in MVP — re-import or manual edits change `memberIds`.

### 2.2 EnrollmentRecord (Planned)

- `id: string`
- `poolId: string`
- `studentId: string`
- `startDate: Date`
- `endDate?: Date`
- `reason?: string`
- `createdByStaffId?: string`
- `createdAt: Date`

**Status:** Planned — not required for reduced MVP but recommended for near‑term to support mid‑year changes.

---

## 3. Grouping plane (MVP: single scenario)

### 3.1 Program (MVP)

A Program is a time‑bounded grouping context.

- `id: string`
- `schoolId?: string`
- `name: string`
- `type: 'CLUBS' | 'ADVISORY' | 'CABINS' | 'CLASS_ACTIVITY' | 'OTHER'`
- `timeSpan: { start: Date; end: Date } | { termLabel: string }`
- `poolIds: string[]` _(Programs reference Pools; in MVP typically one primary pool)_
- `primaryPoolId?: string`
- `ownerStaffIds?: string[]`

**Status:** MVP

### 3.2 Scenario (MVP — single)

A Scenario is the single candidate grouping we produce for a Program in MVP. It must include a `participantSnapshot` of student IDs captured at creation time.

- `id: string`
- `programId: string`
- `status: 'DRAFT' | 'ADOPTED' | 'ARCHIVED'` _(in MVP adopt flow will be simple or implicit; ActiveGrouping is Planned)_
- `groups: Group[]`
- `participantSnapshot: string[]` _(Student IDs at scenario creation — REQUIRED)_
- `createdAt: Date`
- `createdByStaffId?: string`
- `algorithmConfig?: unknown`

**Status:** MVP (single scenario per Program)

> Note: `parentScenarioId` (scenario lineage) is a Planned field for later if scenario forking/versioning is added.

### 3.3 Group (MVP)

- `id: string`
- `name: string`
- `capacity: number | null`
- `memberIds: string[]`
- `leaderStaffId?: string` _(optional primary leader for the group; supported in MVP as data only)_

**Status:** Implemented (Group exists in codebase); `leaderStaffId` is MVP (data field).

### 3.4 ActiveGrouping & AdjustmentEvent (Planned)

ActiveGrouping and AdjustmentEvent are not part of the reduced MVP. They are documented here to keep the vocabulary consistent for future phases.

- `ActiveGrouping` (structure): `programId`, `sourceScenarioId`, `groups[]`, `adjustmentEvents[]`.
- `AdjustmentEvent`: audit log entries capturing manual edits.

**Status:** Planned

---

## 4. Inputs, rules, and signals

### 4.1 Preference (MVP — for analytics)

Students may supply group requests that the grouping algorithm can consume. In MVP preferences are supplied via CSV import alongside pool membership or via a simple upload format.

- `id: string`
- `programId: string`
- `studentId: string`
- `payload: unknown` _(e.g., club ranked list)_

The payload is typically a `StudentPreference` value object with the following shape:

- `studentId: string` — identifier for the student who expressed the preference
- `avoidStudentIds: string[]` — unordered set of classmates they would prefer to avoid (for future constraint support)
- `likeGroupIds: string[]` — ranked list of group IDs they would like to join
- `avoidGroupIds: string[]` — set of group IDs they would rather not join
- `meta?: Record<string, string | number | boolean | null | undefined>` — optional flags for extra signals (e.g., `preferredGroupSize`)

**Status:** MVP (only the minimal preference shape required for analytics)

### 4.2 Analytics / Scenario Satisfaction (MVP)

Minimal analytics we compute for a Scenario based on group request satisfaction:

- `PercentAssignedTopChoice` — percentage of students assigned to their first choice group.
- `AveragePreferenceRankAssigned` — mean numeric rank of assigned group choice (lower is better).
- `PercentAssignedTop2` — percent assigned to one of their top 2 group choices.
- `PercentAssignedTop3` — percent assigned to one of their top 3 group choices.

**Status:** MVP

### 4.3 ConflictRule (Planned)

- `id`, `studentAId`, `studentBId`, `scope: ('SCENARIO'|'PROGRAM'|'PROGRAM_TYPE'|'GLOBAL')`, `timeSpan?`, `createdByStaffId`, `reason?`.

**Status:** Planned

### 4.4 Observation, SurveyResponse, TrustedAdultLink (Future)

- `Observation`: teacher micro‑observations (planned).
- `SurveyResponse`: student surveys (future).
- `TrustedAdultLink`: derived relationship (future).

**Status:** Planned / Future

---

## 5. Invariants & operational rules (reduced MVP)

- Programs reference Pools; Scenarios must snapshot participants at creation and use that snapshot for all grouping computations and analytics.
- Only one Scenario is actively supported per Program in MVP; scenario lineage (parentScenarioId) is Planned.
- Pools are authoritative for membership in MVP (no EnrollmentRecords). Re-imports replace or update `memberIds`.
- Analytics read Scenario.groups and Scenario.participantSnapshot to compute satisfaction metrics.

---

## 6. Migration note (✅ complete)

- ✅ **Migration complete**: The codebase now implements the full hexagonal architecture with all domain entities in `src/lib/domain/`.
- ✅ **Pools implemented**: CSV/TSV import creates Pools with `memberIds` via `createPoolFromRosterData` use case.
- ✅ **Scenario snapshots**: All Scenarios include `participantSnapshot` for reproducibility (implemented in `generateScenario` use case).
- ✅ **Unified wizard**: The "Create Groups" wizard at `/groups/new` provides seamless Pool + Program + Preference creation.

**Status:** MVP implemented

---

## 7. Document status

This domain model defines the reduced MVP artifacts (now **fully implemented**) and the vocabulary for planned/future features. The codebase at `src/lib/domain/` directly implements these types with proper factories and validation. The **Status** tags indicate what's in production code (MVP), what's next (Planned), and what's aspirational (Future).
