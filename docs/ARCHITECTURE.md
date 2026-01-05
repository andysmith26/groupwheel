# Architecture Overview

This document describes the core architecture of the Groupwheel MVP application.

**Goals:**

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
  - `Student`, `Staff`, `Pool`, `Program`, `Scenario`, `Preference`, `Group`, etc.
- Domain factories and validators:
  - `createPool`, `createProgram`, `createScenario`, `createStudent`, etc.
- Domain-specific value types and enums:
  - `ProgramType`, `PoolType`, `ProgramTimeSpan`, `ScenarioStatus`, `GroupCreationMode`, etc.
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
  - `AuthService` (authentication)
  - `SyncService` (server synchronization)

Ports are small TypeScript interfaces (or types):

- **Defined** in `application/ports`.
- **Implemented** in the infrastructure layer.

#### 2.2. Use Cases (`src/lib/application/useCases`)

Use cases encode the **verbs** of the system; they are the only sanctioned way to perform meaningful operations on the domain.

Examples:

- `createProgram`
- `generateScenarioForProgram`
- `computeScenarioAnalytics`
- `getStudentView`
- `createPoolFromRosterData`
- `createGroupingActivity`

Characteristics:

- Each use case is a **function**, not a class:

  ```ts
  export async function generateScenarioForProgram(
  	deps: {
  		programRepo: ProgramRepository;
  		poolRepo: PoolRepository;
  		studentRepo: StudentRepository;
  		preferenceRepo: PreferenceRepository;
  		scenarioRepo: ScenarioRepository;
  		groupingAlgorithm: GroupingAlgorithm;
  		idGenerator: IdGenerator;
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

#### 2.3. Use Case Composition

Use cases may call other use cases when:

- The dependency is conceptually hierarchical (e.g., `createGroupingActivity` coordinates `importRoster` + `createProgram`).
- It avoids redundant validation or duplication.

**Rules for composition:**

- Avoid circular dependencies across use cases.
- If the logic is pure transformation (no I/O, no repository calls), prefer domain factories.
- If it requires coordination across multiple repositories, use a use case.
- Each use case should accept only the ports it needs via `deps`; do not pass `env` objects directly to use cases.

Example — valid composition:

```ts
// Inside createGroupingActivity use case
const poolResult = await importRoster(deps, rosterInput);
if (isErr(poolResult)) return poolResult;

const programResult = await createProgram(deps, programInput);
```

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
- `src/lib/infrastructure/repositories/indexedDb/*`:
  - `IndexedDbScenarioRepository`
  - `IndexedDbStudentRepository`
  - `IndexedDbPoolRepository`
  - etc.
- `src/lib/infrastructure/repositories/synced/*`:
  - `SyncedStudentRepository` (wraps local + sync)
  - `SyncedPoolRepository`
  - etc.

**Services:**

- `UuidIdGenerator` (`IdGenerator` implementation)
- `SystemClock` (`Clock` implementation)
- `BalancedGroupingAlgorithm` (`GroupingAlgorithm` implementation)

**Authentication & Sync:**

- `src/lib/infrastructure/auth/`:
  - `GoogleOAuthAdapter` (`AuthService` implementation)
- `src/lib/infrastructure/sync/`:
  - `SyncManager` (`SyncService` implementation)

**Composition root / environment:**

- `createInMemoryEnvironment` in `src/lib/infrastructure/inMemoryEnvironment.ts` bundles all repositories + services into an `InMemoryEnvironment` object.

Nothing in `infrastructure` should import Svelte components, routes, or Svelte stores.

---

### 3.1. Authentication & Sync (Optional Feature)

Groupwheel supports optional authentication via Google OAuth. When enabled:

- **Anonymous mode (default):** All data stays in browser (IndexedDB). No server communication.
- **Authenticated mode:** Data can sync to the server when the user enables sync; users can also stay local-only while signed in.

**Architecture:**

Authentication and sync follow the hexagonal architecture pattern strictly:

```
application/ports/           infrastructure/
├── AuthService.ts           ├── auth/
├── SyncService.ts           │   ├── GoogleOAuthAdapter.ts
├── StoragePort.ts           │   ├── InMemoryAuthAdapter.ts
└── NetworkStatusPort.ts     │   └── browserAuth.ts (browser singleton)
                             ├── sync/
                             │   ├── SyncManager.ts
                             │   └── browserSyncManager.ts
                             ├── storage/
                             │   ├── LocalStorageAdapter.ts
                             │   └── InMemoryStorageAdapter.ts
                             └── network/
                                 ├── BrowserNetworkStatusAdapter.ts
                                 └── InMemoryNetworkStatusAdapter.ts
```

**Key patterns:**

- `AuthService` and `SyncService` are ports defined in `application/ports/`.
- `GoogleOAuthAdapter` and `SyncManager` are infrastructure adapters.
- Adapters receive dependencies via constructor (StoragePort, NetworkStatusPort, etc.).
- Adapters do NOT import Svelte stores, `$app/navigation`, or other framework code.
- `browserAuth.ts` and `browserSyncManager.ts` provide browser-configured singletons.
- `InMemory*` adapters exist for testing.

**Dependencies flow inward:**

```
UI (routes/components)
  ↓ uses
browserAuth/browserSyncManager (singletons)
  ↓ creates
GoogleOAuthAdapter/SyncManager (adapters)
  ↓ implements
AuthService/SyncService (ports)
```

**How authentication works:**

1. User clicks "Sign in" → `authAdapter.login()` navigates to `/auth/login`
2. Login page redirects to Google OAuth
3. OAuth callback exchanges code for tokens via server endpoint
4. Client reads auth data from cookie, calls `authAdapter.setUser()`
5. Auth state is persisted to localStorage via `StoragePort`
6. `SyncManager` is notified via auth state change callback

**Testing:**

Use `InMemoryAuthAdapter` and `InMemoryStorageAdapter` for testing:

```ts
const storage = new InMemoryStorageAdapter();
const auth = new InMemoryAuthAdapter();
auth.setUser(InMemoryAuthAdapter.createTestUser(), 'test-token');
```

**Configuration:**

Set these environment variables:
- `PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret (server-only)

See `.env.example` for template.

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
	groupTemplateRepo: GroupTemplateRepository;
	idGenerator: IdGenerator;
	clock: Clock;
	groupingAlgorithm: GroupingAlgorithm;
	syncService?: SyncService; // Optional: enabled when user is authenticated
}
```

`createInMemoryEnvironment(seed?)` constructs this environment.

It is used:

- At app startup in `+layout.svelte`.
- In tests if you want "full-stack in-memory" behavior.

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
  - Call the underlying use case with a proper `deps` object.
  - Return the same `Result` type.

The facade bridges the `env` object (used by UI) to the `deps` pattern (used by use cases).

---

### 5. UI Layer (SvelteKit: `src/routes`, `src/lib/components`)

The UI layer is composed of SvelteKit routes, layouts, and components.

**Key patterns:**

- `src/routes/+layout.svelte`:
  - Constructs the environment (currently `createInMemoryEnvironment()`), guarded by `browser`.
  - Calls `setAppEnvContext(env)`.
  - Wraps children inside a layout container.

- Routes like:
  - `src/routes/activities/+page.svelte`
  - `src/routes/activities/new/+page.svelte`
  - `src/routes/activities/[id]/workspace/+page.svelte`

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

### 6. Test Utilities (`src/lib/test-utils`)

Test utilities provide fixtures, helpers, and mocks for testing.

**What lives here:**

- `fixtures.ts` — Pre-built test data with deterministic IDs (e.g., `testStudents`, `testPool`, `createTestFixtures`)
- Future: mock factories, test helpers

**Key characteristics:**

- Test utilities may access any layer directly (domain, infrastructure, repositories).
- Test utilities must **never** be imported by production code.

See [Test Code Exceptions](#test-code-exceptions) for detailed rules.

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
    - Other use cases (for composition)
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

- `src/lib/test-utils/**`:
  - May import from **any layer** (see [Test Code Exceptions](#test-code-exceptions)).
  - Must **never** be imported by production code.

---

## Test Code Exceptions

Test files (`*.spec.ts`, `*.test.ts`) and test utilities (`src/lib/test-utils/**`) may intentionally violate standard layer boundaries for setup, verification, and mocking. These exceptions are tightly scoped.

### Allowed in Test Code

- Importing infrastructure implementations (e.g., `InMemoryStudentRepository`) for direct state manipulation.
- Using domain factories to construct entities with specific IDs for assertions.
- Injecting mock implementations of ports for isolation testing.
- Accessing repositories directly to seed data or verify state.

### Not Allowed (Even in Tests)

- Production code importing from `src/lib/test-utils/**`.
- Casting repositories to concrete types in application layer code.
- Cross-layer mixing in production (e.g., calling use cases from domain).

### Rationale

Tests must sometimes control IDs or inject edge cases not expressible through public APIs. These are isolated deviations that do not justify weakening the production architecture.

### Example: Test Fixtures

The canonical example is `src/lib/test-utils/fixtures.ts`:

```ts
// ✅ Allowed in test code
import { createTestFixtures } from '$lib/test-utils';

const env = createInMemoryEnvironment();
const { program, pool } = await createTestFixtures(env);

// Now run tests against seeded data
```

```ts
// ❌ NOT allowed in production code (e.g., a use case or route)
import { createTestFixtures } from '$lib/test-utils'; // NEVER do this
```

### Known Technical Debt

Resolved: The `PreferenceRepository` port now exposes `save` plus an optional `setForProgram` bulk helper, so tests and fixtures can seed preferences without casting to concrete implementations.

---

## Naming Conventions

To improve clarity and enforceability, follow these patterns:

| Concept                    | Pattern                     | Example                                             |
| -------------------------- | --------------------------- | --------------------------------------------------- |
| Domain entity/value object | Singular noun, PascalCase   | `Student`, `Preference`, `Group`                    |
| Domain factory function    | `create{Entity}`            | `createPool`, `createStudent`                       |
| Use case function          | Verb phrase, camelCase      | `createProgram`, `generateScenarioForProgram`       |
| Use case file              | Matches main function name  | `generateScenarioForProgram.ts`                     |
| Port interface             | Noun or service name        | `GroupingAlgorithm`, `StudentRepository`            |
| Port implementation        | Prefix with storage type    | `InMemoryStudentRepository`, `ApiStudentRepository` |
| Generic utilities          | Descriptive utility name    | `Result`, `ok`, `err` in `types/result.ts`          |
| Test fixture functions     | Include `Test` or `Fixture` | `createTestFixtures`, `testStudents`                |

**Guidelines:**

- Avoid suffixes like `UseCase` on function names (e.g., `createProgram` not `createProgramUseCase`).
- Use `type` or `interface` prefixes only if required to resolve naming ambiguity.
- Keep consistent casing: use case files are camelCase, domain types are PascalCase.

---

## Type Location Rules

Domain types are the single source of truth and live in `src/lib/domain/`.

| Type Category        | Location                     | Examples                                    |
| -------------------- | ---------------------------- | ------------------------------------------- |
| Domain entities      | `src/lib/domain/`            | `Student`, `Group`, `Preference`, `Program` |
| Domain value objects | `src/lib/domain/`            | `StudentPreference`, `GroupCreationMode`    |
| Generic utilities    | `src/lib/types/`             | `Result`, `ok`, `err`                       |
| Port interfaces      | `src/lib/application/ports/` | `StudentRepository`, `GroupingAlgorithm`    |

**Migration note (Dec 2025):** Domain types were previously scattered in `src/lib/types/`. They have been consolidated into `src/lib/domain/`. The `types/index.ts` file contains deprecated re-exports for backward compatibility — update imports to use `$lib/domain` directly.

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
- Adding "helper" modules that mix concepts from multiple layers and blur boundaries.
- Importing from `src/lib/test-utils/**` in production code.
- Passing `env` objects directly to use cases (use the facade to extract deps).
- Using suffixes like `UseCase` on function names.

If in doubt, ask:

> "Is this code describing a user-level operation or domain rule?"  
> If yes → it should probably be in a use case (or domain), not in UI or infra.

---

## Self-Review Checklist

Use this periodically (or per PR) to prevent drift:

- [ ] Does all new domain logic live in `src/lib/domain` or in use cases?
- [ ] Does every new user-visible behavior correspond to a use case?
- [ ] Does any use case import infrastructure or Svelte? (If yes, that's a bug.)
- [ ] Does any route/component talk directly to repositories? (If yes, that's a bug.)
- [ ] Did I add or modify any imports that cross layers against the rules above?
- [ ] Do test files only import infrastructure for legitimate test setup?
- [ ] Are test utilities used only in test files (never in production code)?
- [ ] Are file and function names consistent with naming conventions?
- [ ] Are use cases placed in `application/useCases` and not in services?
- [ ] Does production code avoid importing from `test-utils`?

If the answer to any of these is "yes" (for the bug questions) or "no" (for the should questions), refactor before merging.

---

## Enforcement

The following can be enforced via ESLint rules or code review:

| Rule                                                    | Enforcement                    |
| ------------------------------------------------------- | ------------------------------ |
| No domain imports from `$lib/types` (use `$lib/domain`) | ESLint `no-restricted-imports` |
| No production imports from `test-utils`                 | ESLint `no-restricted-imports` |
| No infrastructure imports in use cases                  | ESLint import boundaries       |
| Consistent naming (no `UseCase` suffix)                 | Code review / custom rule      |

Current ESLint configuration enforces basic import boundaries. Consider extending for stricter layer enforcement as the codebase grows.
