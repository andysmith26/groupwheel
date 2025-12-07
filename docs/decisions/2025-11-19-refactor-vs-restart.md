# Refactor vs Restart (Same Stack) vs Restart (New Stack)

**Date:** 2025-11-20  
**Status:** Accepted

## Context

The repo currently implements single-session grouping prototype. Product vision is evolving to include a program-aware model, supporting clubs, advisory, cabins, class activities, and scenario planning, tracked adjustments after session launch, conflict rules, observations. We need to decide whether to refactor existing codebase or start fresh. If starting fresh do we keep the same stack or switch (ie React).

## Decision

We will refactor the existing repo in place to implement Program / Scenario / ActiveGrouping. We will create a snapshot of the current state in a branch and tag. We will not switch frameworks, and only consider that in the future if a clear technical need arises.

## Consequences

### Benefits

- Preserves history and a clear evolution story (v1 → v2).
- Reuses working pieces (DnD integration, command store, components), reducing immediate effort.
- Enables incremental delivery and user validation while we add Program/Scenario concepts.
- Lower short-term cost than a full rewrite; faster path to a usable MVP for the new use cases.

### Costs

- Requires careful, disciplined refactor to avoid leaking legacy assumptions into new APIs.
- Some parts (singleton command store, UI assumptions) will need moderate rework—non-trivial engineering effort.
- Risk of accumulating transitional technical debt if refactor is rushed or not modularized.
- If later collaboration or ecosystem needs demand React, migrating will incur a larger cost than doing it now.
