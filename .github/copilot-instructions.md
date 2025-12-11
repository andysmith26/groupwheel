# Copilot Instructions for Friend Hat

This repository follows specific conventions and architectural patterns. Follow these guidelines when generating or modifying code.

## Architecture

Friend Hat follows **hexagonal architecture** (ports & adapters) with clean separation:

- **Domain Layer** (`src/lib/domain/`) — Pure business logic with no framework dependencies
  - Contains domain types, factories, validators
  - No references to Svelte, HTTP, fetch, browser APIs, localStorage, etc.
  
- **Application Layer** (`src/lib/application/`)
  - **Ports** (`ports/`) — Interface definitions for repositories and services
  - **Use Cases** (`useCases/`) — Business operations as functions (not classes)
  - Use cases accept `deps` parameter with port interfaces
  - Use cases return `Result<Success, Error>` types (no thrown business errors)
  
- **Infrastructure Layer** (`src/lib/infrastructure/`)
  - Implements ports with actual storage/service logic
  - Uses IndexedDB for persistence in browser, InMemory for tests
  - Environment composition via `createInMemoryEnvironment`
  
- **UI Layer** (SvelteKit routes & components)
  - Routes at `/groups/*`, `/scenarios/*`
  - Gets environment via context, calls use cases through facade helpers in `src/lib/services/appEnvUseCases.ts`

**Critical rule:** Domain layer must remain pure and framework-agnostic. Non-trivial business logic belongs in use cases, not Svelte components.

## Technology Stack

- **SvelteKit 2** with **Svelte 5** (runes-based reactivity)
  - Use `$state`, `$derived`, `$effect` runes for reactivity
  - Use `$props()` for component props
- **TypeScript** (strict mode enabled)
- **Tailwind CSS 4** (via @tailwindcss/vite)
- **Vite 7** (build tool)
- **Testing:** Vitest (unit), Playwright (e2e), vitest-browser-svelte (component)
- **Package Manager:** pnpm

## Key Conventions

### Naming

- **Components:** PascalCase (`StudentCard.svelte`)
- **Files:** kebab-case (`create-program.ts`)
- **Use cases:** Verb phrases (`createProgram`, `generateScenario`)
- **Routes:** Use `/groups/*` URL structure (teacher-facing language)
- **Terminology:** Use "activities" in teacher-facing UI, "programs" in domain model only

### Code Patterns

#### ID Generation
Use `IdGenerator` port (dependency injection) for ID generation, not `crypto.randomUUID()` directly.

```typescript
const id = deps.idGenerator.generate();
```

#### State Management
Use Svelte 5 `$state` runes for reactive store state:

```typescript
let settings = $state({ theme: 'light' });
```

#### Cleanup Pattern
Clean up subscriptions and timeouts in `onDestroy` to prevent memory leaks:

```typescript
import { onDestroy } from 'svelte';

let timeoutId: number;
onDestroy(() => {
  if (timeoutId) clearTimeout(timeoutId);
});
```

#### Auto-save Pattern
Debounce auto-save with 500ms timeout to avoid excessive persistence calls.

#### Wizard Patterns
Wizard components pass config objects and validity state up via callbacks (`onConfigChange`, `onValidityChange`).

### Testing

- Unit test stores in `*.spec.ts` files alongside implementation
- Test use cases with mock ports
- Use test fixtures from `src/lib/test-utils/fixtures.ts` for deterministic test data
- Test code may violate layer boundaries for setup (e.g., directly accessing repositories) — this is intentional and isolated to test code only

### Formatting & Style

- **Prettier:** tabs, single quotes, no trailing commas
- **Tailwind:** Classes sorted via `prettier-plugin-tailwindcss`
- **Comments:** JSDoc for public APIs, inline comments for non-obvious logic
- **Philosophy:** Explain "why" over "what"
- Use existing libraries when possible; only add new ones if absolutely necessary

## File Organization

```
src/
├── lib/
│   ├── domain/          # Pure domain types and factories
│   ├── application/     # Ports and use cases
│   │   ├── ports/       # Interface definitions
│   │   └── useCases/    # Business operations
│   ├── infrastructure/  # Port implementations
│   ├── components/      # Reusable Svelte components
│   │   ├── wizard/      # Create Groups wizard steps
│   │   ├── student/     # Student-related UI
│   │   ├── group/       # Group-related UI
│   │   └── statistics/  # Analytics widgets
│   ├── stores/          # Svelte stores
│   └── services/        # Facade helpers
└── routes/              # SvelteKit routes
    ├── groups/          # Activity management
    └── scenarios/       # Generated groupings
```

## Development Workflow

### Adding New Features

1. **Domain First:** Add/extend types in `src/lib/domain/`
2. **Ports:** Update or add port interfaces in `src/lib/application/ports/`
3. **Use Case:** Implement function in `src/lib/application/useCases/`
   - Accept `deps` object with ports
   - Return typed `Result<Success, ErrorUnion>`
   - Keep it pure (no Svelte, HTTP, DOM APIs)
4. **Infrastructure:** Update implementations to satisfy ports
5. **Facade:** Wire use case into `appEnvUseCases.ts`
6. **UI:** Use `getAppEnvContext()` + facade helper from routes/components

### Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server
pnpm check            # Type check
pnpm lint             # ESLint + Prettier check
pnpm format           # Format with Prettier
pnpm test:unit        # Run unit tests
pnpm test:e2e         # Run Playwright e2e tests
pnpm test             # Run all tests
pnpm build            # Build for production
```

## Data Privacy & Security

- **Privacy-first:** Client-side first, no unnecessary persistence
- **Browser storage:** IndexedDB for scenarios (default), InMemory for tests/SSR
- **No authentication in MVP:** Read-only student views are teacher-presented
- **Never commit secrets:** Use environment variables for sensitive data

## Decision Making

- For strategic architectural choices, create decision records in `docs/decisions/YYYY-MM-DD-title.md`
- For technical exploration, create spike logs in `docs/spikes/NNN-title.md`
- Keep decision records concise (7-10 minutes to write)
- Document context, decision, alternatives, and consequences

## Import Rules

- Domain layer imports: Only from other domain files
- Application layer: Can import from domain, but not infrastructure or UI
- Infrastructure: Can import from domain and application
- UI layer: Can import from any layer

Violations of these rules break the architecture's modularity and should be avoided.

## Common Pitfalls to Avoid

❌ Don't write business logic directly in Svelte components
❌ Don't use `crypto.randomUUID()` directly — use `IdGenerator` port
❌ Don't throw errors from use cases — return `Result<T, E>` types
❌ Don't import framework code into domain layer
❌ Don't forget to clean up subscriptions/timeouts in `onDestroy`
❌ Don't add dependencies without checking if existing libraries can solve the problem

✅ Do keep domain layer pure and testable
✅ Do use dependency injection through ports
✅ Do debounce auto-save operations
✅ Do follow hexagonal architecture layers
✅ Do use Svelte 5 runes for reactivity
✅ Do write tests alongside implementation
