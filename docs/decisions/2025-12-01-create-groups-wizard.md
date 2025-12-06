# "Create Groups" Wizard

**Date:** 2025-12-01
**Status:** Accepted

## Context

The current onboarding for teachers is build around domain terminology (pool, program, preferences) that doesn't match how teachers think about their task. User feedback revealed:

1. Teachers didn't want to take the time to think through the difference between a "pool" and a "program". This distinction does matter architecturally but the current UI puts this complexity up front for the teachers before they have a reason to care about the difference.

2. Teachers were confused about where to do what, which led to a loss of momentum and flow. They pasted roster data on one page, then preferences on another page, then had to find a third page to build the groups.

3. Silent failures on import caused teachers to think the tool was broken when a student's friend didn't appear in the roster data.

For the MVP we define success as "teacher can import CSV, create Program, generate Scenario, and view analytics in <15 minutes end-to-end." Current flow friction works against this.

## Decision

Implement a unified three-step wizard at `/groups/new` that:

1. **Consolidates the flow:** Students → Preferences → Name, all on one page with clear progression
2. **Uses teacher language:** "Create Groups" instead of "Create Program", activity names instead of Pool/Program distinction
3. **Hides architectural concepts until valuable:** The Pool/Program separation happens internally. Teachers discover roster reuse organically when they create a second activity and see "Start from existing students" as an option.
4. **Provides immediate validation:** Each paste shows a preview with counts, warnings, and the ability to correct column mappings before proceeding.

The URL structure changes from `/programs/*` to `/groups/*` to align with teacher mental models. Old URLs redirect to new ones.

## Alternatives Considered

**A. Keep Pool/Program separation but rename ("Roster" / "Activity"):**

- Pro: Explicit model, power users understand what they're doing
- Con: Still requires teachers to learn two concepts before getting value
- Rejected because: First-time experience matters most for MVP adoption

**B. Smart single-paste with auto-detection:**

- Pro: Lowest friction—paste anything, system figures it out
- Con: Magic detection fails unpredictably; debugging requires understanding the model anyway
- Deferred to: Future "power paste" entry point once the structured wizard proves the core flow

## Consequences

**Benefits:**

- Teachers complete the full flow without leaving the wizard
- Error states are visible at each step, not discovered after the fact
- Roster reuse emerges naturally on second use rather than requiring upfront explanation
- URL structure (`/groups/*`) matches user intent

**Costs/Risks:**

- Existing URLs break (mitigated by redirects)
- Internal Pool/Program model is less visible, which could confuse developers unfamiliar with the codebase (mitigated by code comments and this decision record)
- Teachers who want explicit roster management have no dedicated UI for it in MVP (acceptable; can add `/rosters` page post-MVP if needed)

**Migration:**

- `/programs` → redirects to `/groups`
- `/programs/new` → redirects to `/groups/new`
- `/programs/[id]` → redirects to `/groups/[id]`
- `/pools/import` → redirects to `/groups/new`
