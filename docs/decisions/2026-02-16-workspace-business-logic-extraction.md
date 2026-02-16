# Decision: Extract workspace business logic into application use cases

- Date: 2026-02-16
- Status: Accepted

## Context

The workspace route at `src/routes/activities/[id]/workspace/+page.svelte` contained non-trivial business rules, including:

- Workspace row-layout parsing/normalization/repair and config-shape updates
- Result-history insertion bounds and cursor movement logic
- "Edited since publish" decision logic
- Group display-order resolution used by exports/rendering

These behaviors are domain-adjacent application concerns, but they were implemented inline inside the Svelte route. This reduced testability and weakened layer boundaries in the hexagonal architecture.

## Decision

Move workspace business logic into pure application-layer use cases under `src/lib/application/useCases/`:

- `normalize-workspace-row-layout.ts`
- `manage-workspace-history.ts`
- `detect-workspace-edits-since-publish.ts`
- `get-workspace-groups-display-order.ts`

Expose facade helpers in `src/lib/services/appEnvUseCases.ts` so UI routes/components call service-layer functions only.

Keep behavior identical by preserving the route's existing call sites, state transitions, and UX outcomes.

## Alternatives considered

1. **Leave logic in route**
   - Rejected: keeps business rules coupled to UI and harder to test.
2. **Move logic into Svelte stores**
   - Rejected: improves organization but still UI-oriented and not clearly application-layer.
3. **Move logic into infrastructure utilities**
   - Rejected: incorrect layer ownership; no infrastructure dependency exists.

## Consequences

### Positive

- Better adherence to hexagonal architecture boundaries
- Pure, unit-testable business rules with `Result<Success, ErrorUnion>` contracts
- Route file focuses on UI orchestration instead of business algorithms
- Reusable logic for future workspace surfaces

### Trade-offs

- Slightly more indirection via facade helper calls
- Additional type exports and test maintenance across more files
