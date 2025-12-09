# Friend‑Hat — Use Cases (reduced MVP + roadmap mapping)

_Last updated: 2025-12-07_

This catalog maps prioritized user flows to the reduced MVP and shows which flows are planned for later. Each use case includes actors, the core flow, minimum success criteria, and the domain entities involved.

---

## Status legend

- **MVP** — ✅ Implemented in the reduced MVP (complete as of Dec 2025).
- **Planned** — Near‑term work after MVP.
- **Future** — Longer term.

---

## 1. Overview / priorities

MVP focus (✅ implemented)

- **Unified "Create Groups" wizard** consolidating Pool import, Program creation, and Preference upload.
- Pool import from CSV/TSV (roster ingestion via paste interface).
- Program creation referencing a Pool.
- Single Scenario generation (participant snapshot) using balanced grouping algorithm.
- Analytics (satisfaction metrics: top choice %, average rank, top 2 %).
- Read‑only student view (teacher‑presented mode, no auth).

Planned / Future (deferred)

- ActiveGrouping edits, ConflictRules, EnrollmentRecords, SIS sync, authentication, observations, deep analytics, student accounts.

---

## 2. Use case: Import Pool from CSV (MVP) ✅

- **Actor:** Teacher / Admin
- **Goal:** Create a named Pool (roster) by pasting CSV/TSV data.
- **Frequency:** Start of term; occasional updates.
- **Success criteria (MVP):**
  - Paste CSV/TSV with headers is validated and parsed.
  - System shows live preview with student count and column mapping.
  - A Pool is created with `memberIds` assigned (new Student records created as needed).
  - Pool status set to `ACTIVE` and `primaryStaffOwnerId` set to creator by default.
- **Entities touched:** Pool, Student, Staff.
- **Edge cases & UI notes:** Duplicate detection by ID; clear validation messages for malformed data.
- **Implementation:** Integrated into "Create Groups" wizard at `/groups/new` (Step 2: Students). See [wizard decision](decisions/2025-12-01-create-groups-wizard.md).

**Status:** MVP ✅ Implemented

---

## 3. Use case: Create Program & associate Pool (MVP) ✅

- **Actor:** Teacher / Admin
- **Goal:** Create a Program (grouping activity) and associate the Pool that contains participants.
- **Frequency:** Once per Program lifecycle.
- **Success criteria (MVP):**
  - Staff can create a Program with name, type, and timeSpan.
  - Program references `primaryPoolId` (from existing Pools or newly created one).
  - Program saved with `poolIds` (MVP typically uses one).
- **Entities touched:** Program, Pool, Staff.
- **Implementation:** Integrated into "Create Groups" wizard at `/groups/new` (Step 4: Name). For returning users, Step 1 allows roster reuse.

**Status:** MVP ✅ Implemented

---

## 4. Use case: Generate single Scenario (MVP) ✅

- **Actor:** Teacher / Admin
- **Goal:** Run the balanced grouping algorithm on the Program's Pool snapshot to produce groups.
- **Frequency:** Per Program instantiation (e.g., once per club run, once per class activity).
- **Success criteria (MVP):**
  - System resolves Pool memberIds and writes `Scenario.participantSnapshot`.
  - Balanced grouping algorithm (300 swap iterations, targets 4-6 students per group) produces groups.
  - Scenario with `groups` is stored and viewable in UI.
  - Results displayed immediately with analytics badges.
- **Entities touched:** Program, Pool, Scenario, Group, Preference.
- **Constraints:** No scenario forking or multiple versions in MVP (single scenario per Program).
- **Implementation:** Available on activity detail page at `/groups/[id]` with "Generate Groups" button.

**Status:** MVP ✅ Implemented

---

## 5. Use case: Basic analytics / scenario satisfaction (MVP) ✅

- **Actor:** Teacher / Admin
- **Goal:** Understand how well the Scenario satisfies student preferences.
- **Frequency:** Immediately after Scenario generation / during review.
- **Success criteria (MVP):**
  - System computes `PercentAssignedTopChoice`, `PercentAssignedTop2`, and `AveragePreferenceRankAssigned`.
  - Analytics displayed as badges on activity detail page.
  - Metrics computed from participant snapshot for reproducibility.
- **Entities touched:** Scenario, Preference, Student, Group.
- **Notes:** Preference ingestion via CSV paste in wizard (Step 3); analytics shown immediately after generation.
- **Implementation:** Uses `computeScenarioAnalytics` use case, displayed on `/groups/[id]` page.

**Status:** MVP ✅ Implemented

---

## 6. Use case: Read‑only student view (MVP) ✅

- **Actor:** Teacher (presenting) / Student (viewing)
- **Goal:** Students can see the final grouping for the Scenario in a read‑only way.
- **Frequency:** After Scenario generation.
- **Success criteria (MVP):**
  - Teacher can open a "student view" mode and project or display it in class.
  - Data is read‑only; no student account or auth required for MVP.
  - Student view shows all groups with member names in clean, print-friendly layout.
- **Privacy note:** Because there is no authentication in MVP, student view is intended for teacher presentation (not an unsupervised public link).
- **Entities touched:** Scenario, Group, Student.
- **Implementation:** Available at `/scenarios/[id]/student-view` with link from activity detail page.

**Status:** MVP ✅ Implemented

---

## 7. Use case: Minimal pool edits / archive (Deferred)

- **Actor:** Teacher / Admin
- **Goal:** Make small corrective edits to Pool membership between imports (e.g., remove a student who transferred out).
- **Frequency:** Occasionally mid‑term.
- **Success criteria:**
  - UI supports add/remove of students in Pool memberIds.
  - Pool `status` can be set to `ARCHIVED` at year end.
- **Note:** No EnrollmentRecord temporal tracking in MVP; changes are represented by editing `memberIds` (and re‑importing as needed).
- **Current state:** Domain models and repositories support this, but no UI implemented. Teachers can re-run wizard to create new roster version.

**Status:** Deferred (not in MVP UI)

---

## 8. Planned use cases (near‑term)

- ActiveGrouping adoption and AdjustmentEvents (staff can adopt a scenario and then make live edits that are logged).
- ConflictRules definition and enforcement (counselor workflows).
- EnrollmentRecord support for mid‑year membership history.
- SIS sync with scheduled imports and reconciliation flows.
- Light authentication + student accounts (for read/write student interactions).

Each Planned use case will be decomposed into acceptance criteria and implementation steps post‑MVP.

**Status:** Planned

---

## 9. Acceptance criteria templates

For each MVP feature we use a simple Given/When/Then template:

Example: Scenario snapshot

- Given: A Program referencing Pool P with members M.
- When: Staff invokes "Create Scenario".
- Then: System writes Scenario with `participantSnapshot = M` and `groups` are produced from algorithm. Snapshot is immutable.

---

## 10. Backlog (prioritized)

MVP (✅ complete)

1. ✅ Unified "Create Groups" wizard with roster reuse
2. ✅ CSV/TSV Pool import via paste with preview and validation
3. ✅ Program creation integrated into wizard
4. ✅ Preference upload via paste with mismatch warnings
5. ✅ Single Scenario generation with participant snapshot
6. ✅ Balanced grouping algorithm with preference optimization
7. ✅ Basic analytics (PercentAssignedTopChoice, PercentAssignedTop2, AveragePreferenceRankAssigned)
8. ✅ Read‑only student view (teacher‑presented UI) at `/scenarios/[id]/student-view`

Near‑term (Planned)

1. Pool manual edit UI (domain/use cases ready, UI deferred)
2. EnrollmentRecords and basic membership history
3. ActiveGrouping adoption and AdjustmentEvent logging
4. ConflictRule management UI and algorithm enforcement
5. SIS sync connectors and scheduled imports
6. Analytics dashboard/hub

Later (Future)

1. Observations, surveys, trusted adult links, social graph building
2. Student auth and student portal with student-submitted preferences
3. Advanced fairness algorithms and cross-term tracking
4. Multi-school admin workflows

---

## 11. Implementation notes

✅ **Completed (Dec 2025):**

- Domain model fully implemented in `src/lib/domain/` with factories and validation
- Hexagonal architecture with clean separation (domain/application/infrastructure/UI layers)
- All MVP use cases implemented as functions in `src/lib/application/useCases/`
- Wizard at `/groups/new` provides seamless end-to-end flow
- Activity dashboard at `/groups` with scenario status and analytics
- Student view at `/scenarios/[id]/student-view` for classroom presentation

**Technical implementation:**

- Use cases accept `deps` objects (ports) and return `Result<Success, Error>` types
- Domain entities validated via factory functions (e.g., `createPool`, `createScenario`)
- InMemory repositories for MVP (swappable via ports for future persistence)
- Scenario reproducibility via `participantSnapshot` field

---

## 12. Document status

**Status:** ✅ MVP Complete (documented as of Dec 2025). All core use cases implemented and deployed. Planned and Future features clearly marked for post-MVP work.
