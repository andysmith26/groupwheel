# Groupwheel - Claude Code Guide

This file helps Claude Code understand and work effectively with the Groupwheel codebase.

## Project Overview

Groupwheel is a privacy-first toolbox for K-12 teachers to form student groups. All data stays in the browser—no server, no accounts, no data collection.

**Core workflow:**

1. Import student roster (CSV/TSV)
2. Define groups with optional capacity limits
3. Generate groupings (random/balanced algorithms)
4. Review & refine with drag-drop editing
5. Present to class via read-only student view

## Architecture

This project uses **Hexagonal Architecture** (ports & adapters pattern) with strict layer separation:

```
src/lib/
├── domain/           # Core business logic (pure TypeScript, framework-agnostic)
├── application/      # Use cases and orchestration
├── infrastructure/   # Adapters (storage, external services)
├── algorithms/       # Group generation algorithms
├── services/         # Cross-cutting concerns
├── components/       # Svelte UI components
├── stores/           # Svelte state management
├── utils/            # Shared utilities
└── types/            # TypeScript type definitions
```

**Key principles:**

- Domain layer has no dependencies on frameworks or UI
- Dependencies flow inward (UI → Application → Domain)
- See `docs/ARCHITECTURE.md` for detailed layer boundaries

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (using runes API)
- **TypeScript** (strict mode)
- **Tailwind CSS 4**
- **Vite** for builds
- **Playwright** for e2e tests
- **Vitest** for unit tests

## Important Conventions

### TypeScript

- Strict mode enabled
- Prefer explicit types over inference for public APIs
- Use discriminated unions for state management

### Svelte 5 Runes

- Use `$state()`, `$derived()`, `$effect()` instead of stores where possible
- Component props use `$props()` syntax
- Event handlers use `onclick` not `on:click`

### Naming

- Domain entities: PascalCase (e.g., `Student`, `Group`)
- Services: PascalCase with suffix (e.g., `RosterImportService`)
- Components: PascalCase (e.g., `StudentCard.svelte`)
- Utilities: camelCase (e.g., `generateId.ts`)

### File Organization

- One entity/service per file
- Group related files in folders by domain concept
- Index files for public exports only

## Key Domain Entities

**Student**: Individual student with ID, name, optional metadata
**Group**: Named container for students with optional capacity
**GroupTemplate**: Reusable group definitions (e.g., "6 tables of 4")
**Roster**: Collection of students
**Session**: Current working state (roster + groupings)

See `docs/domain_model.md` for complete entity definitions.

## Storage & State

- **LocalStorage**: Primary persistence via `infrastructure/storage/`
- **Svelte stores**: Reactive state management in `stores/`
- **No backend**: Everything runs client-side

## Testing

```bash
pnpm test              # All tests
pnpm test:unit         # Unit tests (Vitest)
pnpm test:e2e          # E2E tests (Playwright)
```

**Test locations:**

- Unit tests: Adjacent to source files (`.test.ts`)
- E2E tests: `/e2e/` directory

## Common Tasks

### Adding a new feature

1. Define domain logic in `lib/domain/`
2. Create use case in `lib/application/`
3. Build UI in `lib/components/`
4. Wire up state in `lib/stores/`
5. Add route if needed in `src/routes/`

### Modifying group generation

- Algorithms live in `lib/algorithms/`
- Current algorithms: random, balanced (more planned)

### Adding storage

- Implement adapter in `lib/infrastructure/storage/`
- Follow existing localStorage pattern

## Documentation

Comprehensive docs are in `/docs/`:

- `ARCHITECTURE.md`: Layer design and boundaries
- `PRODUCT.md`: Vision, roadmap, use cases
- `domain_model.md`: Entity relationships
- `UX_STRATEGY.md`: Design principles
- `STATUS.md`: Current state and known gaps
- `decisions/`: Architectural decision records
- `spikes/`: Technical experiments

## Development Commands

```bash
pnpm dev              # Start dev server (localhost:5173)
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm check            # Type checking
pnpm lint             # Linting
pnpm format           # Format code
```

## What to Avoid

- Don't mix framework code into domain layer
- Don't add external dependencies without justification
- Don't create server-side code (this is client-only)
- Don't add telemetry or analytics (privacy-first)
- Don't bypass the layer architecture

## Key Files to Reference

- `svelte.config.js`: SvelteKit configuration
- `vite.config.ts`: Build configuration
- `tsconfig.json`: TypeScript settings
- `tailwind.config.js`: Styling configuration (Tailwind 4)
- `PROJECT_HISTORY.md`: Major pivots and context

## Questions?

When uncertain about:

- **Architecture**: Check `docs/ARCHITECTURE.md`
- **Domain logic**: Check `docs/domain_model.md`
- **Product direction**: Check `docs/PRODUCT.md`
- **Current state**: Check `docs/STATUS.md`
- **Past decisions**: Check `docs/decisions/`

## Project Philosophy

1. **Privacy-first**: No data leaves the browser
2. **Teacher-centered**: Built for real classroom workflows
3. **Learning project**: Clean architecture and best practices matter
4. **Pragmatic**: Ship value, iterate based on feedback
