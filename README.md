# Groupwheel

**Groups shaped together.** A privacy-first toolbox for K-12 teachers to form student groups—from five-minute discussion pairs to semester-long clubs.

[![Status: MVP Complete](https://img.shields.io/badge/status-MVP%20complete-green)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)]()

## Quick Start

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server → http://localhost:5173
pnpm check            # Type check
pnpm test             # Run all tests
```

## What It Does

1. **Import roster** — Paste CSV/TSV student data
2. **Define groups** — Create named groups with optional capacity limits
3. **Generate groupings** — Random/balanced assignment (request-based coming soon)
4. **Review & refine** — Drag-drop editing with undo/redo
5. **Present to class** — Read-only student view for projection

No accounts required. All data stays in your browser.

## Documentation

| Document                              | Description                                     |
| ------------------------------------- | ----------------------------------------------- |
| [Product & Roadmap](docs/reference/PRODUCT.md)  | Vision, use cases, what's planned               |
| [Architecture](docs/reference/ARCHITECTURE.md)  | Technical design, layer boundaries, conventions |
| [Domain Model](docs/reference/domain_model.md)  | Entity definitions and relationships            |
| [UX Strategy](docs/reference/UX_STRATEGY.md)    | Design principles and phased UX evolution       |
| [Current Status](docs/reference/STATUS.md)      | What's built, what works, known gaps            |
| [Research Log](docs/reference/RESEARCH.md)      | User research findings                          |
| [Project History](PROJECT_HISTORY.md)            | Major pivots and historical context             |
| [Decisions](docs/decisions/)                     | Architectural decision records                  |
| [Spikes](docs/spikes/)                           | Technical experiments                           |
| [Planning](docs/planning/)                       | Active planning specs and work packages         |

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes)
- **TypeScript** (strict)
- **Tailwind CSS 4**
- **Hexagonal architecture** (ports & adapters)

## Project Goals

1. Ship a valuable product for real teachers
2. Learn product development and software architecture
3. Build portfolio evidence

## Contributing

This is currently a solo learning project. If you're interested in contributing, open an issue to discuss.

### Fixing Boundary Lint Errors

- Run `pnpm lint:boundaries` to check architectural import boundaries.
- If `no-restricted-imports` fails, move business logic into `src/lib/application/useCases` or `src/lib/domain` instead of importing across layers.
- In routes/components, prefer `src/lib/services/appEnvUseCases.ts` facades for runtime operations.
- Domain files must stay framework-agnostic: no `svelte` or `@sveltejs/*` imports.
- See [docs/reference/ARCHITECTURE.md](docs/reference/ARCHITECTURE.md) for the layer rules and expected dependency direction.

## License

MIT
