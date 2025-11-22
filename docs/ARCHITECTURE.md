# Architecture Overview

This document describes the core architecture of the Friend Hat MVP application.

Goals:

- Keep **domain rules and invariants explicit** and testable.
- Make **application use cases** the only way to perform meaningful operations.
- Keep **infrastructure (storage, APIs, browser APIs)** replaceable behind ports.
- Keep the **UI thin**, delegating non-trivial logic to use cases.

We follow a **layered, hexagonal architecture** (ports & adapters) with a domain-centric, use-case oriented design.

---

## Layers and Modules

### 1. Domain Layer (`src/lib/domain`)

The domain layer defines core business concepts as pure data + invariants.

**What lives here:**

- Domain types and value objects:
  - `Student`, `Staff`, `Pool`, `Program`, `Scenario`, `Preference`, etc.
- Domain factories and validators:
  - `createPool`, `createProgram`, `createScenario`, etc.
- Domain-specific value types and enums:
  - `ProgramType`, `PoolType`, `ProgramTimeSpan`, `ScenarioStatus`, etc.
- Pure domain utilities (if needed).

**What does _not_ live here:**

- No references to Svelte, HTTP, fetch, browser APIs, Google Sheets, localStorage, etc.
- No repositories or infrastructure implementations.
- No Svelte stores or components.

The domain layer is intended to be **pure** and framework-agnostic.

---

### 2. Application Layer (`src/lib/application`)

The application layer orchestrates domain objects to implement **use cases**.

It has two sub-parts:

#### 2.1. Ports (`src/lib/application/ports`)

Ports are **interfaces** that define how the application layer talks to the outside world.

Examples:

- Repositories:
  - `StudentRepository`
  - `StaffRepository`
  - `PoolRepository`
  - `ProgramRepository`
  - `ScenarioRepository`
  - `PreferenceRepository`
- Services:
  - `IdGenerator`
  - `Clock`
  - `GroupingAlgorithm`

Ports are small TypeScript interfaces (or types):

- **Defined** in `application/ports`.
- **Implemented** in the infrastructure layer.

#### 2.2. Use Cases (`src/lib/application/useCases`)

Use cases encode the **verbs** of the system; they are the only sanctioned way to perform meaningful operations on the domain.

Examples:

- `createProgramUseCase`
- `generateScenarioForProgram`
- `computeScenarioAnalytics`
- `getStudentView`
- `createPoolFromRosterData`

Characteristics:

- Each use case is a **function**, not a class:

  ```ts
  export async function generateScenarioForProgram(
  	deps: {
  		programRepo: ProgramRepository;
  		// ...
  	},
  	input: GenerateScenarioInput
  ): Promise<Result<Scenario, GenerateScenarioError>> {
  	// ...
  }
  ```

- Dependencies arrive via a `deps` object of **ports** and pure utilities.
- Inputs and outputs are plain data:
  - `input` objects
  - `Result<Success, ErrorUnion>` rather than thrown business errors.
- No Svelte, no DOM APIs, no direct `fetch` calls.

Use cases may throw only in true programmer-error situations; business errors should be represented via `Result` variants.

---

### 3. Infrastructure Layer (`src/lib/infrastructure`)

The infrastructure layer provides **adapters** that implement ports plus related services:

**Repositories:**

- `src/lib/infrastructure/repositories/inMemory/*`:
  - `InMemoryStudentRepository`
  - `InMemoryStaffRepository`
  - `InMemoryPoolRepository`
  - `InMemoryProgramRepository`
  - `InMemoryScenarioRepository`
  - `InMemoryPreferenceRepository`

**Services:**

- `UuidIdGenerator` (`IdGenerator` implementation)
- `SystemClock` (`Clock` implementation)
- In-memory `GroupingAlgorithm` implementation

**Composition root / environment:**

- `createInMemoryEnvironment` in `src/lib/infrastructure/inMemoryEnvironment.ts` bundles all repositories + services into an `InMemoryEnvironment` object.

Nothing in `infrastructure` should import Svelte components, routes, or Svelte stores.

---

### 4. Environment and Facades

#### 4.1. Environment (`InMemoryEnvironment`)

`InMemoryEnvironment` is a runtime container that holds concrete implementations of all ports:

```ts
export interface InMemoryEnvironment {
	studentRepo: StudentRepository;
	staffRepo: StaffRepository;
	poolRepo: PoolRepository;
	programRepo: ProgramRepository;
	scenarioRepo: ScenarioRepository;
	preferenceRepo: PreferenceRepository;
	idGenerator: IdGenerator;
	clock: Clock;
	groupingAlgorithm: GroupingAlgorithm;
}
```

`createInMemoryEnvironment(seed?)` constructs this environment.

It is used:

- At app startup in `+layout.svelte`.
- In tests if you want “full-stack in-memory” behavior.

#### 4.2. Svelte Context (`src/lib/contexts/appEnv.ts`)

We expose the environment to Svelte components via context:

- `setAppEnvContext(env: InMemoryEnvironment)` — called once in `+layout.svelte`.
- `getAppEnvContext(): InMemoryEnvironment` — used by routes/components to obtain the environment.

The context keeps UI code from constructing or owning repositories directly.

#### 4.3. Facade (`src/lib/services/appEnvUseCases.ts`)

`appEnvUseCases.ts` provides **thin helpers** that take an environment and call use cases with the correct dependencies wired.

Examples:

- `createPoolFromRoster(env, input)`
- `createProgram(env, input)`
- `generateScenario(env, input)`
- `computeAnalytics(env, input)`
- `getStudentViewForScenario(env, input)`

These helpers:

- Must not implement business logic.
- Only:
  - Extract repos/services from `env`.
  - Call the underlying use case.
  - Return the same `Result` type.

---

### 5. UI Layer (SvelteKit: `src/routes`, `src/lib/components`)

The UI layer is composed of SvelteKit routes, layouts, and components.

**Key patterns:**

- `src/routes/+layout.svelte`:
  - Constructs the environment (currently `createInMemoryEnvironment()`), guarded by `browser`.
  - Calls `setAppEnvContext(env)`.
  - Wraps children inside a layout container.

- Routes like:
  - `src/routes/programs/+page.svelte`
  - `src/routes/programs/new/+page.svelte`

  use:
  - `getAppEnvContext()` inside `onMount` or event handlers to get `env`.
  - Facade helpers from `$lib/services/appEnvUseCases` to call use cases.

Example:

```ts
import { onMount } from 'svelte';
import { getAppEnvContext } from '$lib/contexts/appEnv';
import { createProgram } from '$lib/services/appEnvUseCases';
import { isErr } from '$lib/types/result';

onMount(async () => {
	const env = getAppEnvContext();
	const result = await createProgram(env, {
		/* input */
	});

	if (isErr(result)) {
		// handle error
	} else {
		// handle success
	}
});
```

UI components and routes **must not**:

- Instantiate repositories directly.
- Reach into `env.*Repo` for anything beyond trivial reads.
- Duplicate domain validation logic that belongs in use cases or domain factories.

All non-trivial operations should be expressed as calling a use case (via the facade).

---

## Allowed Dependencies (Import Rules)

Allowed dependency directions:

- `src/lib/domain/**`:
  - May import only from:
    - Other `src/lib/domain/**` modules.
    - Generic utilities (e.g., `src/lib/types/result`).
  - Must **not** import from:
    - `src/lib/application/**`
    - `src/lib/infrastructure/**`
    - `src/routes/**` or Svelte code

- `src/lib/application/ports/**`:
  - May import from:
    - `src/lib/domain/**` (for types).
  - Must **not** import from:
    - `src/lib/application/useCases/**`
    - `src/lib/infrastructure/**`
    - `src/routes/**`

- `src/lib/application/useCases/**`:
  - May import from:
    - `src/lib/domain/**`
    - `src/lib/application/ports/**`
    - Shared utilities (`src/lib/types/result`, etc.)
  - Must **not** import from:
    - `src/lib/infrastructure/**`
    - `src/routes/**` or Svelte

- `src/lib/infrastructure/**`:
  - May import from:
    - `src/lib/domain/**`
    - `src/lib/application/ports/**`
  - Must **not** import from:
    - `src/lib/application/useCases/**`
    - `src/routes/**` or Svelte

- `src/lib/contexts/**`:
  - May import from:
    - `src/lib/infrastructure/inMemoryEnvironment` (for `InMemoryEnvironment` type).
  - Must **not** contain business logic.

- `src/lib/services/appEnvUseCases.ts`:
  - May import from:
    - `src/lib/infrastructure/inMemoryEnvironment`
    - `src/lib/application/useCases/**`
    - `src/lib/application/ports/**` (for types)
  - Must **not** implement domain/business rules.

- `src/routes/**` and `src/lib/components/**`:
  - May import from:
    - `src/lib/contexts/**`
    - `src/lib/services/appEnvUseCases`
    - `src/lib/domain/**` for types and display logic
  - Should **not**:
    - Import from `src/lib/application/useCases/**` directly.
    - Import from `src/lib/infrastructure/**` directly.
    - Talk to repositories directly for anything non-trivial.

---

## Adding New Features

When adding a new feature:

1. **Domain first**:
   - Do we need new domain types, fields, or invariants?
   - Add/extend them in `src/lib/domain`.

2. **Ports**:
   - Do we need new repository/service methods?
   - Update or add ports in `src/lib/application/ports`.

3. **Use case**:
   - Implement a new function in `src/lib/application/useCases`.
   - Accept a `deps` object (ports) and a typed `input`.
   - Return a typed `Result<Success, ErrorUnion>`.

4. **Infrastructure**:
   - Update the `infrastructure` implementations to satisfy the new ports.

5. **Env + Facade**:
   - Wire the new use case into `appEnvUseCases.ts` (extract deps from `env` and call it).

6. **UI**:
   - Use `getAppEnvContext()` + the new facade helper from routes/components.

If you find yourself writing non-trivial business logic directly in a Svelte route, that logic probably belongs in a use case.

---

## Anti-Patterns (What Not To Do)

- Calling `env.*Repo` directly from routes/components for anything beyond trivial reads.
- Duplicating domain validation or rules in Svelte components.
- Having `src/lib/infrastructure/**` import from `src/lib/application/useCases/**`.
- Having `src/lib/domain/**` import from `src/lib/application/**` or `src/lib/infrastructure/**`.
- Adding “helper” modules that mix concepts from multiple layers and blur boundaries.

If in doubt, ask:

> “Is this code describing a user-level operation or domain rule?”  
> If yes → it should probably be in a use case (or domain), not in UI or infra.

---

## Self-Review Checklist

Use this periodically (or per PR) to prevent drift:

- [ ] Does all new domain logic live in `src/lib/domain` or in use cases?
- [ ] Does every new user-visible behavior correspond to a use case?
- [ ] Does any use case import infrastructure or Svelte? (If yes, that’s a bug.)
- [ ] Does any route/component talk directly to repositories? (If yes, that’s a bug.)
- [ ] Did I add or modify any imports that cross layers against the rules above?

If the answer to any of these is “yes”, refactor before merging.
