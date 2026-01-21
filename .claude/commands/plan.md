Research and plan before implementing. Do not write code until I approve the plan.

## Problem

$ARGUMENTS

## Step 1: Research the codebase

Before proposing anything, ground yourself in this repository:

1. **Find relevant patterns**: Search for existing code that solves similar problems. Note file paths and line numbers.
2. **Identify files to modify**: Which files will this change touch? List them.
3. **Check related tests**: What tests exist for related functionality? How do they verify behavior?
4. **Look for domain types**: Are there existing types in src/lib/domain/ that apply?
5. **Check for existing use cases**: Is there a use case in src/lib/application/useCases/ that already does part of this?

## Step 2: Check architecture constraints

Read ARCHITECTURE.md (or docs/ARCHITECTURE.md if present). Then verify:

- Which layer(s) does this change touch? (domain / application / infrastructure / UI)
- Does this require a new use case, or does it extend an existing one?
- Are there any anti-patterns to avoid? (business logic in components, direct repo calls from UI, etc.)

Flag any architectural concerns before proceeding.

## Step 3: Propose 2-3 approaches

For each approach, include:

- **What it does differently** from the others
- **Files created/modified** (with paths)
- **Trade-offs**:
  - Implementation effort: quick win / moderate / significant
  - Best-practice alignment: canonical / acceptable / technical debt
  - Maintenance burden: simple / manageable / complex

## Step 4: Make a recommendation

State which approach you recommend and why (1-2 decisive reasons). Note what would flip the choice.

## Step 5: Wait for approval

Present your research findings and plan. Do not implement until I say to proceed.
