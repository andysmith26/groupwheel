# Friend‑Hat — Use Cases (reduced MVP + roadmap mapping)

_Last updated: 2025-11-21_

This catalog maps prioritized user flows to the reduced MVP and shows which flows are planned for later. Each use case includes actors, the core flow, minimum success criteria, and the domain entities involved.

---

## Status legend

- **MVP** — Implement in the reduced MVP.  
- **Planned** — Near‑term work after MVP.  
- **Future** — Longer term.

---

## 1. Overview / priorities

MVP focus (explicit)
- Pool import from CSV (roster ingestion).  
- Program creation referencing a Pool.  
- Single Scenario generation (participant snapshot) using the grouping engine.  
- Minimal analytics (how well scenario matches student preferences).  
- Read‑only student view (teacher‑presented or teacher‑view mode).  

Planned / Future (deferred)
- ActiveGrouping edits, ConflictRules, EnrollmentRecords, SIS sync, authentication, observations, deep analytics, student accounts.

---

## 2. Use case: Import Pool from CSV (MVP)

- **Actor:** Teacher / Admin  
- **Goal:** Create a named Pool (roster) by uploading a CSV file.  
- **Frequency:** Start of term; occasional updates.  
- **Success criteria (MVP):**
  - Upload CSV with headers is validated and parsed.
  - System shows a preview and allows field mapping (at minimum: studentId, firstName, lastName).
  - A Pool is created with `memberIds` assigned (new Student records created as needed).
  - Pool status set to `ACTIVE` and `primaryStaffOwnerId` set to uploader by default.
- **Entities touched:** Pool, Student, Staff.
- **Edge cases & UI notes:** Duplicate detection by ID/email; helpful conflict resolution UI; reject malformed rows with clear messages.

**Status:** MVP

---

## 3. Use case: Create Program & associate Pool (MVP)

- **Actor:** Teacher / Admin  
- **Goal:** Create a Program for grouping and associate the Pool that contains participants.  
- **Frequency:** Once per Program lifecycle.  
- **Success criteria (MVP):**
  - Staff can create a Program, select primaryPoolId (from Pools they own or have access to).
  - Program saved with `poolIds` (MVP typically uses one).
- **Entities touched:** Program, Pool, Staff.

**Status:** MVP

---

## 4. Use case: Generate single Scenario (MVP)

- **Actor:** Teacher / Admin  
- **Goal:** Run the grouping algorithm on the Program's Pool snapshot to produce groups.  
- **Frequency:** Per Program instantiation (e.g., once per club run, once per class activity).  
- **Success criteria (MVP):**
  - System resolves Pool memberIds and writes `Scenario.participantSnapshot`.
  - Grouping algorithm produces a Scenario with `groups` and stores the result.
  - Scenario is viewable in UI and exportable as CSV.
- **Entities touched:** Program, Pool, Scenario, Group.
- **Constraints:** No scenario forking or multiple versions in MVP (single scenario per Program).

**Status:** MVP

---

## 5. Use case: Basic analytics / scenario satisfaction (MVP)

- **Actor:** Teacher / Admin  
- **Goal:** Understand how well the Scenario satisfies student preferences.  
- **Frequency:** Immediately after Scenario generation / during review.  
- **Success criteria (MVP):**
  - System computes `PercentAssignedTopChoice` and `AveragePreferenceRankAssigned`.
  - Analytics panel displays these metrics with simple explanations and a small table of per‑student assignment rank.
  - Admin can export analytics summary as CSV for record‑keeping.
- **Entities touched:** Scenario, Preference, Student, Group.
- **Notes:** Preference ingestion via CSV in MVP; UI shows how metrics are computed.

**Status:** MVP

---

## 6. Use case: Read‑only student view (MVP)

- **Actor:** Teacher (presenting) / Student (viewing)  
- **Goal:** Students can see the final grouping for the Scenario in a read‑only way.  
- **Frequency:** After Scenario generation/adoption.  
- **Success criteria (MVP):**
  - Teacher can open a "student view" mode and project or display it in class.
  - Data is read‑only; no student account or auth required for MVP.
  - Student view shows the groups the student is in, group name, and (optionally) leaderStaffId.
- **Privacy note:** Because there is no authentication in MVP, student view is intended for teacher presentation (not an unsupervised public link).
- **Entities touched:** Scenario, Group, Student.

**Status:** MVP

---

## 7. Use case: Minimal pool edits / archive (MVP-lite / optional)
- **Actor:** Teacher / Admin  
- **Goal:** Make small corrective edits to Pool membership between imports (e.g., remove a student who transferred out).  
- **Frequency:** Occasionally mid‑term.  
- **Success criteria (MVP-lite):**
  - UI supports add/remove of students in Pool memberIds.
  - Pool `status` can be set to `ARCHIVED` at year end.
- **Note:** No EnrollmentRecord temporal tracking in MVP; changes are represented by editing `memberIds` (and re‑importing as needed).

**Status:** MVP (minimal)

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

MVP (now)
1. CSV Pool import, preview, validation.
2. Program creation UI pointing to Pool.
3. Single Scenario generation with participant snapshot.
4. Basic analytics panel (PercentAssignedTopChoice, AveragePreferenceRankAssigned).
5. Read‑only student view (teacher‑presented UI).
6. Minimal Pool edit/archival UI.

Near‑term (Planned)
1. EnrollmentRecords and basic membership history.
2. ActiveGrouping adoption and AdjustmentEvent logging.
3. ConflictRule management UI and algorithm enforcement.
4. SIS sync connectors and scheduled imports.

Later (Future)
1. Observations, surveys, trusted adult links, social graph building.
2. Student auth and student portal.
3. Advanced fairness algorithms and scheduling helpers.

---

## 11. Next steps (practical)

- Convert the domain model to a small set of TypeScript interfaces and persistence schemas (after MVP docs are finalized).  
- Create a minimal import validation UI spec and import flow.  
- Implement scenario snapshot behavior in the grouping workflow and basic analytics.

---

## 12. Document status

**Status:** Planning (reduced MVP specified here; many features intentionally planned/future).
