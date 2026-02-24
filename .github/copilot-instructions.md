# Copilot Instructions for Groupwheel

For comprehensive project conventions, architecture, and coding guidelines, see [CLAUDE.md](../CLAUDE.md) in the repository root.

Key points:

- **Architecture:** Hexagonal (ports & adapters) with strict layer separation (domain/application/infrastructure/UI)
- **Tech stack:** SvelteKit 2, Svelte 5 (runes), TypeScript strict, Tailwind CSS 4
- **Domain layer must remain pure** — no framework or browser dependencies
- **Use cases return `Result<T, E>` types** — no thrown business errors
- **Privacy-first:** All data stays in the browser; no telemetry
- **Decisions:** `docs/decisions/YYYY-MM-DD-title.md`
- **Spikes:** `docs/spikes/NNN-title.md`
- **Reference docs:** `docs/reference/`
