# Plan: Migrate `scenarioEditingStore` to Svelte 5 Runes

- Date: 2026-02-16
- Status: In Progress (Phases 1-2 Complete)
- Scope: `src/lib/stores/scenarioEditingStore.ts` (+ adjacent call sites/tests only as needed)

## Goal

Replace legacy Svelte 4 store primitives (`writable`, `derived`, `get`) in `ScenarioEditingStore` with Svelte 5 runes while preserving behavior, API shape, and test outcomes.

## Current State (Baseline)

- Store is class-based and implements `Readable<ScenarioEditingView>`.
- Internal state is managed with `writable` + `derived`.
- File is high complexity (~1k lines) with undo/redo, debounced autosave, retries, analytics recomputation, and unassigned ordering logic.
- Tests exist in `src/lib/stores/scenarioEditingStore.spec.ts` and should be treated as behavioral contract.

## Non-Goals

- No UX changes.
- No command model rewrite.
- No repository/API contract changes.
- No broad refactor of workspace VM beyond migration necessities.

## Migration Strategy

### Phase 1 — Characterization + Safety Net

1. Keep existing tests green (`scenarioEditingStore.spec.ts`, targeted workspace tests).
2. Add/adjust focused tests only for migration-sensitive behavior:
   - debounce/save status transitions
   - undo/redo cursor behavior
   - drag/reorder + unassigned ordering
   - retry/failure terminal state
3. Snapshot public API used by call sites:
   - `subscribe`, `initialize`, `dispatch`, `undo`, `redo`, `regenerate`, `destroy`, etc.

Exit criteria:

- All baseline tests pass before touching implementation.

### Phase 2 — Introduce Runes-backed State (Internal)

1. Replace internal `writable<InternalState>` with `$state` object.
2. Replace `derived(...)` view creation with computed getters / rune-friendly projection.
3. Keep external `Readable` compatibility via lightweight adapter (`subscribe` over projected view), so callers do not break.
4. Preserve timeout/cleanup behavior for save debounce, analytics debounce, and saved-idle transitions.

Exit criteria:

- Public API remains backward-compatible for existing consumers.
- Tests still pass without call-site rewrites.

### Phase 3 — Remove Legacy Store Imports

1. Remove `svelte/store` dependency from `scenarioEditingStore.ts`.
2. Ensure no `get(...)` usage remains in production store implementation.
3. Keep compatibility for tests that may still read via helper patterns (adapt tests if needed, not production API semantics).

Exit criteria:

- No `writable/derived/get` imports in `scenarioEditingStore.ts`.
- Lint/typecheck pass for touched files.

### Phase 4 — Optional API Simplification (Follow-up)

1. Evaluate whether `Readable` compatibility layer can be replaced by rune-native consumption in all callers.
2. Only proceed if all call sites are migrated and no external contract depends on `Readable`.

Exit criteria:

- Deferred unless explicitly prioritized.

## Risks and Mitigations

- **Risk:** Regression in undo/redo semantics.
  - **Mitigation:** Keep command history logic unchanged; migrate state mechanism only.
- **Risk:** Timer lifecycle leaks.
  - **Mitigation:** Explicit timer ownership + cleanup assertions in tests.
- **Risk:** Autosave race conditions.
  - **Mitigation:** Preserve in-flight save guards and retry policy as-is.

## Acceptance Criteria

- Behavior parity for existing scenarios (manual + automated).
- No direct `svelte/store` usage in `scenarioEditingStore.ts`.
- Existing workspace flows behave unchanged (move, reorder, undo/redo, regenerate, autosave).
- Targeted tests and lint/typecheck pass.

## Suggested Execution Order

1. Small preparatory PR: add/solidify characterization tests.
2. Migration PR: internal state + derived view conversion.
3. Cleanup PR: remove legacy imports and tighten lint guard.

## Progress Update (2026-02-16)

- ✅ Phase 1 complete
  - `scenarioEditingStore.spec.ts` green with characterization coverage for:
    - debounce/save status transitions
    - undo/redo behavior
    - drag/reorder + unassigned ordering
    - retry/failure terminal state
    - public API surface used by call sites (`subscribe`, `initialize`, `dispatch`, `undo`, `redo`, `regenerate`, `destroy`, plus editing operations)
- ✅ Phase 2 complete
  - Replaced internal `writable` + `derived` mechanics with class-owned state and projected view adapter while preserving `Readable`-compatible `subscribe` semantics.
  - Preserved debounce/save/retry/timer lifecycle behavior and existing public API.
- ⏳ Phase 3 not started
- ⏳ Phase 4 deferred (unchanged)
