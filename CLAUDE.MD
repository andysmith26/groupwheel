# Groupwheel - Claude Code Guide

This file helps Claude Code understand and work effectively with the Groupwheel codebase.

## Project Overview

Groupwheel is a privacy-first toolbox for K-12 teachers to form student groups. All data stays in the browser—no server required. Optional Google sign-in enables importing from Google Sheets; core features work without accounts.

**Core workflow:**

1. Import student roster (CSV/TSV or Google Sheets)
2. Define groups with optional capacity limits
3. Generate groupings (random/balanced algorithms)
4. Review & refine with drag-drop editing
5. Present to class via read-only student view

## Architecture

This project uses **Hexagonal Architecture** (ports & adapters pattern) with strict layer separation:

```
src/lib/
├── domain/           # Core business logic (pure TypeScript, framework-agnostic)
├── application/      # Use cases (useCases/) and ports (ports/)
├── infrastructure/   # Adapters: auth, repositories, sheets, sync, storage, http, clipboard, network
├── algorithms/       # Group generation algorithms
├── services/         # Cross-cutting concerns
├── components/       # Svelte UI components (ui/, wizard/, workspace/, auth/, etc.)
├── stores/           # Svelte state management
├── contexts/         # Svelte context providers
├── utils/            # Shared utilities
├── types/            # TypeScript type definitions
├── data/             # Static data files
├── content/          # Static content
├── assets/           # Static assets
└── test-utils/       # Testing utilities
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
**Pool**: Collection of students available for grouping
**Program**: Top-level container (class/course) owning pools, scenarios, templates
**Scenario**: A specific grouping configuration within a program
**Placement**: Assignment of a student to a group
**Preference**: Student preferences for grouping (e.g., partner choices)
**SheetConnection**: Link to a Google Sheet for data import
**Staff**: Staff members (teachers, aides)

See `docs/domain_model.md` for complete entity definitions.

## Storage & State

- **IndexedDB**: Primary persistence via `infrastructure/repositories/indexedDb/`
- **Synced repositories**: Optional cloud sync via `infrastructure/repositories/synced/`
- **In-memory repositories**: For testing via `infrastructure/repositories/inMemory/`
- **Svelte stores**: Reactive state management in `stores/`
- **No backend required**: Core features run entirely client-side

## Authentication & External Services

- **Google OAuth**: Optional sign-in via `infrastructure/auth/`
- **Google Sheets API**: Import rosters from private sheets via `infrastructure/sheets/`
- Auth is entirely optional—core grouping features work without signing in

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

### Adding storage/repositories

- Implement repository in `lib/infrastructure/repositories/`
- Create IndexedDB, InMemory, and optionally Synced variants
- Follow existing repository patterns (e.g., `ProgramRepository`)

## Documentation

Comprehensive docs are in `/docs/`:

- `ARCHITECTURE.md`: Layer design and boundaries
- `PRODUCT.md`: Vision, roadmap, use cases
- `domain_model.md`: Entity relationships
- `UX_STRATEGY.md`: Design principles
- `STATUS.md`: Current state and known gaps
- `ALGORITHMS.md`: Group generation algorithm details
- `ALGORITHMS_TUTORIAL.md`: Guide to algorithm implementation
- `RESEARCH.md`: Research notes and references
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
- `src/app.css`: Tailwind 4 configuration (CSS-first)
- `PROJECT_HISTORY.md`: Major pivots and context

## Questions?

When uncertain about:

- **Architecture**: Check `docs/ARCHITECTURE.md`
- **Domain logic**: Check `docs/domain_model.md`
- **Product direction**: Check `docs/PRODUCT.md`
- **Current state**: Check `docs/STATUS.md`
- **Past decisions**: Check `docs/decisions/`

## Project Philosophy

1. **Privacy-first**: Data stays in the browser; optional Google sign-in only for Sheets import
2. **Teacher-centered**: Built for real classroom workflows
3. **Learning project**: Clean architecture and best practices matter
4. **Pragmatic**: Ship value, iterate based on feedback
