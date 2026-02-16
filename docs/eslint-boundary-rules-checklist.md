# Scoped Checklist: ESLint Architecture Boundary Rules

- Date: 2026-02-16
- Status: In Progress
- Scope: enforce hexagonal boundaries in production code (tests remain flexible)

## Objective

Codify and enforce layer import boundaries so domain/application/UI rules are automatically checked during lint.

## Baseline (Already Present)

- `eslint.config.js` already uses `no-restricted-imports` in key areas.
- Existing protections include:
  - domain disallowing application/infrastructure/routes imports (relative pattern based)
  - useCases disallowing infrastructure/routes imports (relative pattern based)
  - routes disallowing direct infrastructure/useCase imports (relative pattern based)
  - blocking `$lib/test-utils` in production files

## Checklist

### 1) Normalize Boundary Rules to Alias-based Patterns

- [ ] Add `$lib/...` alias patterns in addition to relative patterns for each restricted layer.
- [ ] Ensure both direct module and subtree imports are covered (e.g., `$lib/infrastructure/*` and `$lib/infrastructure/**`).
- [ ] Keep exclusions for `*.spec.*`, `*.test.*`, `src/lib/test-utils/**`, and `e2e/**`.

### 2) Strengthen Application-Layer Guardrails

- [ ] Add explicit rule for `src/lib/application/ports/**` to prevent imports from `infrastructure`, `routes`, and UI modules.
- [ ] Confirm use cases can import from `domain`, `application/ports`, and utility-only modules.
- [ ] Prevent accidental imports from route files in application layer.

### 3) Keep Domain Pure

- [ ] Confirm domain prohibits imports from application, infrastructure, routes, components, and stores.
- [ ] Allow domain-to-domain imports only.
- [ ] Verify no framework imports (`svelte`, `@sveltejs/*`) in domain files.

### 4) Enforce UI Consumption Path

- [ ] Ensure `src/routes/**` and `src/lib/components/**` avoid direct infrastructure imports where app-env service facades exist.
- [ ] Keep exception list minimal and documented when direct use-case imports are temporarily required.

### 5) Add Regression Fixtures (Lightweight)

- [ ] Add small lint fixture files or use existing files to validate at least one expected failure per boundary.
- [ ] Add one “allowed import” case per layer to avoid over-restricting.

### 6) CI + Developer Workflow

- [ ] Ensure `pnpm lint` runs boundary checks in CI.
- [ ] Document boundary rules in `docs/ARCHITECTURE.md` (link to ESLint config section).
- [ ] Add a short “how to fix boundary lint errors” note in contributor docs.

## Recommended First Increment

1. Alias-pattern hardening in `eslint.config.js` (no behavior changes beyond better coverage).
2. Ports-specific guardrails.
3. One regression fixture per major layer boundary.

## Done Definition

- Boundary violations fail lint deterministically for alias and relative imports.
- No false positives on current production code.
- Rules are documented and discoverable for contributors.
