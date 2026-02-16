# Workspace Route Boundary Contract

This document defines ownership between the workspace route layout and page.

## Layout (`+layout.svelte`) owns

- Route-level shell/frame for the workspace subtree
- Lifecycle cleanup for workspace chrome stores when leaving the subtree
- Stable wrapper semantics that child pages can rely on

## Page (`+page.svelte`) owns

- Workspace editor interactions (drag/drop, keyboard moves, undo/redo)
- Command execution wiring and toasts
- Scenario/activity data loading and editor-derived state
- Editor-specific loading, error, and success rendering

## Boundary notes

- No domain/application behavior changes are introduced by this split.
- The layout remains presentational and does not introduce new business logic.
- If shared data is needed across multiple workspace child pages later, add `+layout.ts` then.
