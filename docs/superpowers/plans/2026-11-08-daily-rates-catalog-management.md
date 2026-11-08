# Daily Rates Catalog Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe category and item management directly to Daily Scrapboard Rates.

**Architecture:** Preserve stable item keys and the existing custom catalog. Add category label/disabled configuration plus per-item overrides/disabled state to shared pricing, resolve the active catalog through central helpers, and save management edits through a revision-guarded admin catalog scope.

**Tech Stack:** TypeScript, browser DOM templates, Node.js server, libSQL/Turso, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-08-daily-rates-catalog-management-design.md`

## Global Constraints

- Management controls are visible only to administrators inside Daily Rates.
- Historical transaction keys and records must not be rewritten or removed.
- Built-in and referenced entries deactivate; only unused custom entries may be permanently deleted.
- Buying and exports include active catalog entries only.
- Failed or stale shared-state saves roll back the attempted catalog mutation.

## Review Focus

- Duplicate category/item labels after normalization must be rejected.
- Deactivating a category must hide all of its items from Buying without erasing rates.
- A stale catalog-management write must fail instead of resurrecting deleted or old definitions.
- Referenced custom items must not expose permanent delete.
- Staff must not see or invoke management actions.

---

### Task 1: Catalog resolution and persistence

**Files:**
- Modify: `public/app.ts`
- Modify: `src/server.ts`
- Test: `tests/scrapboard-custom-items.test.mjs`
- Test: `tests/scrapboard-pricing-server.test.mjs`

**Interfaces:**
- Produces: resolved category labels/active state, resolved item overrides/active state, admin mutation helpers, and authoritative revision-guarded `catalog-management` saves.

- [ ] Write failing tests for built-in overrides, category deactivation, duplicate rejection, history-safe deletion, staff denial, save rollback, and stale server writes.
- [ ] Run the focused tests and confirm they fail.
- [ ] Implement catalog configuration normalization and mutation helpers while preserving stable keys.
- [ ] Implement the admin-only `catalog-management` server scope with candidate validation and revision protection.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Daily Rates management UI

**Files:**
- Modify: `public/app.ts`
- Modify: `public/index.html`
- Test: `tests/scrapboard-custom-items.test.mjs`

**Interfaces:**
- Consumes: Task 1 catalog resolution and mutation helpers.
- Produces: category and item management dialogs/actions rendered inside Daily Rates.

- [ ] Write failing render and interaction tests for admin controls, edit fields, deactivate/activate copy, conditional delete, and staff visibility.
- [ ] Run the focused tests and confirm they fail.
- [ ] Implement compact category/item controls and dialogs using the existing cream/charcoal/brass design system.
- [ ] Ensure Buying, rate saving, lookup, and export paths consume only the active resolved catalog.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Full verification and deployment

**Files:**
- Modify: generated `public/app.js` through the existing build.

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: tested production deployment connected to GitHub and Turso.

- [ ] Run `npm run build`, `npm test`, and `npm run typecheck` and require zero failures.
- [ ] Check `git diff --check` and review the scoped diff.
- [ ] Commit and push to `main` so the connected Vercel project deploys automatically.
- [ ] Verify the production deployment, Turso health, and authenticated Daily Rates response.

