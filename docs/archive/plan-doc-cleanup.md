# Documentation Cleanup Plan

## Research Findings

### Current state: ~17,000 lines across 45+ markdown files

The documentation is comprehensive and well-structured in its **core reference set**, but has accumulated significant **planning debris** — superseded plans, abandoned specs, and fragmented UX redesign documents scattered across the repo root, `docs/`, and `plans/`.

### Key issues identified

1. **Stale copilot instructions** — `.github/copilot-instructions.md` still says "Friend Hat" (rebranded to Groupwheel in Dec 2025), references old routes and patterns
2. **Orphaned plan files at repo root** — `plan.md`, `plan-block-based-grouping.md`, `plan-student-tracking.md`, `IMPLEMENTATION_PLAN_FOR_UX_OVERHAUL.md` are all superseded by newer specs
3. **Completed archive items still cluttering** — `docs/archive/eslint-boundary-rules-checklist.md` is fully checked off
4. **Dead spike file** — `docs/spikes/002-cancelled.md` is 0 bytes
5. **No spikes README** — unlike `docs/decisions/`, spikes has no index
6. **`.DS_Store` in docs/** — should be gitignored
7. **`docs/PRINCIPLES.md` overlap** — 676-line cross-project reference that overlaps heavily with `docs/ARCHITECTURE.md`
8. **`docs/data_model_diagram.md` vs `docs/domain_model.md`** — two related docs with unclear relationship
9. **Multiple planning directories** — `plans/simplify-flows/`, `docs/project-simplify-again/`, `docs/project blizzard/` — unclear which is authoritative

---

## Approach A: Conservative Cleanup (Recommended)

Focus on removing clearly dead content, archiving superseded plans, and fixing stale references. No restructuring.

### Changes

| Action | File(s) | Why |
|--------|---------|-----|
| **Delete** | `docs/spikes/002-cancelled.md` | Empty file, zero value |
| **Delete** | `docs/.DS_Store` | OS artifact; add to `.gitignore` |
| **Delete** | `docs/archive/eslint-boundary-rules-checklist.md` | Fully completed checklist, no ongoing reference value |
| **Archive** | `plan.md` → `docs/archive/` | Superseded by project-simplify-again |
| **Archive** | `plan-block-based-grouping.md` → `docs/archive/` | Superseded |
| **Archive** | `plan-student-tracking.md` → `docs/archive/` | Superseded |
| **Archive** | `IMPLEMENTATION_PLAN_FOR_UX_OVERHAUL.md` → `docs/archive/` | Superseded |
| **Update** | `.github/copilot-instructions.md` | Replace "Friend Hat" with "Groupwheel", update routes, or simply redirect to CLAUDE.md |
| **Add** | `docs/spikes/README.md` | Index of spikes with status (matches decisions/ pattern) |
| **Add** | `.gitignore` entry for `.DS_Store` | Prevent future OS artifacts |

### Trade-offs
- **Effort:** Quick (1-2 hours)
- **Best-practice alignment:** Canonical — removes dead weight without losing history (git preserves it)
- **Risk:** Low — nothing controversial, no restructuring
- **Maintenance burden:** Simple

---

## Approach B: Moderate Consolidation

Everything in Approach A, plus consolidate overlapping reference docs and clarify the planning hierarchy.

### Additional changes beyond Approach A

| Action | File(s) | Why |
|--------|---------|-----|
| **Merge** | `docs/data_model_diagram.md` into `docs/domain_model.md` | Two docs covering the same entities; combine diagrams into the model doc |
| **Trim** | `docs/PRINCIPLES.md` | Add header clarifying this is a cross-project reference, link from ARCHITECTURE.md instead of duplicating |
| **Add** | `docs/PLANNING_INDEX.md` | Single index explaining the relationship between `plans/simplify-flows/`, `docs/project-simplify-again/`, and `docs/project blizzard/` |
| **Update** | `docs/decisions/2025-11-15-canonical-preference-schema.md` | Already marked historical; move to `docs/archive/` since the feature was removed |
| **Update** | `.github/copilot-instructions.md` | Slim down to just point at CLAUDE.md (avoid maintaining two AI instruction files) |

### Trade-offs
- **Effort:** Moderate (half a day)
- **Best-practice alignment:** Canonical — reduces duplication, improves discoverability
- **Risk:** Medium — merging docs requires care to not lose nuance
- **Maintenance burden:** Reduces ongoing burden by having fewer overlapping docs

---

## Approach C: Full Restructure

Everything in A + B, plus reorganize the entire doc tree around clear categories.

### Additional changes beyond Approach B

| Action | Description |
|--------|-------------|
| **Reorganize** `docs/` into subdirectories: `reference/`, `planning/`, `archive/`, `decisions/`, `spikes/` | Clear separation of living reference docs vs. planning specs vs. historical records |
| **Move** `plans/simplify-flows/` into `docs/planning/` | Single location for all planning docs |
| **Move** `docs/project-simplify-again/` and `docs/project blizzard/` into `docs/planning/` | Consolidate |
| **Update** all cross-references in CLAUDE.md, ARCHITECTURE.md, etc. | Keep links valid |

### Trade-offs
- **Effort:** Significant (full day+)
- **Best-practice alignment:** Ideal long-term, but over-engineering for a solo/small project
- **Risk:** High — breaks all existing doc references, git blame noise, CLAUDE.md needs rewrite
- **Maintenance burden:** Lower long-term, but high upfront cost

---

## Recommendation: Approach A with selective elements from B

**Start with Approach A** — it's low-risk, high-impact, and can be done in one session. The repo root gets cleaned up, stale files are removed, and the copilot instructions stop being actively misleading.

**Cherry-pick from B:**
- The `PLANNING_INDEX.md` — because the planning fragmentation is the biggest confusion point
- Slimming `.github/copilot-instructions.md` to just reference CLAUDE.md — avoids maintaining two AI instruction sets

**Skip Approach C** unless the project grows to have multiple contributors. The current `docs/` structure is fine; the problem is stale content, not bad organization.

### What would flip the choice
- If you're onboarding collaborators soon → go full B
- If doc structure is actively confusing you → consider C
- If you just want quick wins → pure A is fine

---

## Summary of all files affected

### Delete (3 files)
- `docs/spikes/002-cancelled.md`
- `docs/.DS_Store`
- `docs/archive/eslint-boundary-rules-checklist.md`

### Move to `docs/archive/` (4 files)
- `plan.md`
- `plan-block-based-grouping.md`
- `plan-student-tracking.md`
- `IMPLEMENTATION_PLAN_FOR_UX_OVERHAUL.md`

### Update (2 files)
- `.github/copilot-instructions.md` — slim to reference CLAUDE.md
- `.gitignore` — add `.DS_Store`

### Create (2 files)
- `docs/spikes/README.md` — spike index
- `docs/PLANNING_INDEX.md` — explains relationship between planning docs
