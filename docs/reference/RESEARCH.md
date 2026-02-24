# User Research Log

Findings from user contact that inform product decisions. Newest entries first.

**Maintenance:** Add entry immediately after any user contact. Review monthly for patterns.

---

## Entry Format

```
## YYYY-MM-DD: [Source Type]
**Source:** [Interview / Observation / Support request / Usability test]
**Participant:** [Role, context]

**Finding:** [What you learned]

**Quotes:** (optional)
> "Actual words"

**Impact:** [How this affects product]
```

---

## 2024-12: Teacher Workflow Observation

**Source:** Observation / Interview  
**Participant:** K-8 teachers (multiple, informal)

**Finding:** Group management is not a one-time task. Teachers return to adjust groups throughout the semester as students request changes, conflicts arise, and clubs merge/split. The "wizard → done" mental model doesn't match actual workflow.

**Impact:** Led to UX Strategy shift from wizard paradigm to workspace paradigm. See [UX_STRATEGY.md](UX_STRATEGY.md).

---

## 2024-11: Terminology Confusion

**Source:** Usability observation  
**Participant:** Middle school teacher, first-time user

**Finding:** Teacher didn't want to think through "Pool" vs "Program" distinction. The architectural concepts were presented before she had a reason to care. She just wanted to "make groups" and these extra steps felt like friction.

**Quotes:**

> "I don't know what a pool is. Can I just paste my students?"

**Impact:** Led to unified wizard design that hides Pool/Program distinction until valuable. Teacher language ("roster", "activity") used in UI; domain terms reserved for code. See [decision record](decisions/2025-12-01-create-groups-wizard.md).

---

## 2024-11: Navigation Confusion

**Source:** Usability observation  
**Participant:** Elementary teacher

**Finding:** Teacher pasted roster on one page, preferences on another, then couldn't find where to generate groups. Multi-page flow broke momentum. She said "I thought I was done" after pasting preferences.

**Impact:** Consolidated into single wizard flow. Added clear step indicators. "Generate" happens automatically at end of wizard.

---

## 2024-11: Silent Import Failures

**Source:** Support request  
**Participant:** High school teacher

**Finding:** Teacher thought tool was broken because a student's friend preference wasn't matching. The friend wasn't in the roster, but there was no warning—just silent omission from results.

**Quotes:**

> "It said it worked but Jenny's friends weren't showing up"

**Impact:** Added mismatch warnings in preference import step. Preview shows exactly what will be imported and what won't match.

---

## 2024-10: Algorithm as Starting Point

**Source:** Interview  
**Participant:** MS activity coordinator

**Finding:** Teacher never expects algorithm output to be final. She always tweaks based on knowledge the system doesn't have (siblings, recent conflicts, parent requests). Algorithm is a "starting point" she refines.

**Quotes:**

> "I always move a few kids around. The computer doesn't know that Marcus and Devon had a fight last week."

**Impact:** Validates candidate gallery approach (Phase 2). Also reinforces need for robust drag-drop editing. Teacher's mental model: algorithm suggests, human decides.

---

## Research Patterns (Review Monthly)

### Confirmed Patterns

1. **Terminology matters** — Teachers use "roster" and "groups", not "pool" and "scenario"
2. **Workflow is continuous** — Groups are living documents, not one-time outputs
3. **Algorithm = suggestion** — Teachers always expect to refine
4. **Errors must be visible** — Silent failures destroy trust

### Open Questions

1. How do teachers currently handle mid-semester roster changes?
2. What triggers a "regenerate from scratch" vs "minor tweak" decision?
3. How much do teachers care about fairness across multiple activities?

---

## Planned Research

| Study                     | Goal                                | When               |
| ------------------------- | ----------------------------------- | ------------------ |
| Pilot feedback            | Validate MVP meets <15 min workflow | After pilot launch |
| Candidate gallery testing | Does 3-5 options help or overwhelm? | Phase 2 planning   |
| Semester follow-up        | How do groups evolve over time?     | End of semester    |
