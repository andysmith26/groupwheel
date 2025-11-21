# Friend‑Hat Domain Model (reduced MVP + target vocabulary)

_Last updated: 2025-11-21_

This conceptual domain model defines the canonical nouns and relationships for Friend‑Hat. It reflects the reduced MVP decisions (explicitly annotated) while preserving vocabulary for planned and future features so migration and refactors are straightforward.

---

## Status legend

- **MVP** — In scope for the reduced MVP (to be implemented first).  
- **Planned** — Near‑term work, after MVP.  
- **Future** — Long‑term/aspirational.

> Note: The codebase currently implements an early grouping UI; this model is intentionally ahead of the code (aspirational in places) to lock vocabulary for future refactors.

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
- `schoolId?: string` *(optional in MVP; recommended for multi-school)*  
- `name: string`  
- `type: 'SCHOOL' | 'GRADE' | 'CLASS' | 'TRIP' | 'CUSTOM'`  
- `memberIds: string[]` *(derived from CSV import; edits via UI/replace import)*  
- `primaryStaffOwnerId?: string`  
- `ownerStaffIds?: string[]`  
- `timeSpan?: { start: Date; end?: Date }`  
- `status: 'ACTIVE' | 'ARCHIVED'`  
- `source?: 'IMPORT' | 'MANUAL'`  
- `parentPoolId?: string` *(kept for future hierarchical support but not used in MVP)*

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
- `poolIds: string[]` *(Programs reference Pools; in MVP typically one primary pool)*  
- `primaryPoolId?: string`  
- `ownerStaffIds?: string[]`

**Status:** MVP

### 3.2 Scenario (MVP — single)
A Scenario is the single candidate grouping we produce for a Program in MVP. It must include a `participantSnapshot` of student IDs captured at creation time.

- `id: string`  
- `programId: string`  
- `status: 'DRAFT' | 'ADOPTED' | 'ARCHIVED'` *(in MVP adopt flow will be simple or implicit; ActiveGrouping is Planned)*  
- `groups: Group[]`  
- `participantSnapshot: string[]` *(Student IDs at scenario creation — REQUIRED)*  
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
- `leaderStaffId?: string` *(optional primary leader for the group; supported in MVP as data only)*

**Status:** Implemented (Group exists in codebase); `leaderStaffId` is MVP (data field).

### 3.4 ActiveGrouping & AdjustmentEvent (Planned)
ActiveGrouping and AdjustmentEvent are not part of the reduced MVP. They are documented here to keep the vocabulary consistent for future phases.

- `ActiveGrouping` (structure): `programId`, `sourceScenarioId`, `groups[]`, `adjustmentEvents[]`.  
- `AdjustmentEvent`: audit log entries capturing manual edits.

**Status:** Planned

---

## 4. Inputs, rules, and signals

### 4.1 Preference (MVP — for analytics)
Students may supply preferences that the grouping algorithm can consume. In MVP preferences are supplied via CSV import alongside pool membership or via a simple upload format.

- `id: string`  
- `programId: string`  
- `studentId: string`  
- `payload: unknown` *(e.g., club ranked list)*

**Status:** MVP (only the minimal preference shape required for analytics)

### 4.2 Analytics / Scenario Satisfaction (MVP)
Minimal analytics we compute for a Scenario:

- `PercentAssignedTopChoice` — percentage of students assigned to their first choice.  
- `AveragePreferenceRankAssigned` — mean numeric rank of assigned choice (lower is better).  
- (Optional) `PercentAssignedTop2` — percent assigned to top 2.

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

## 6. Migration note (conceptual)

- The current codebase uses `groups` and in-memory student lists. When we implement Pools, we will migrate existing roster data into Pools (import or script) and ensure Scenario creations write `participantSnapshot` so older experiments remain reproducible.

**Status:** Planned

---

## 7. Document status

This domain model defines the reduced MVP artifacts and the vocabulary for planned/ future features. It is intentionally prescriptive to reduce future refactor cost. Treat the **Status** tags as the source of truth for what to expect in the running code.
