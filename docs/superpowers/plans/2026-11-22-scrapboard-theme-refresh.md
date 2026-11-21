# Scrapboard Theme Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a cohesive soft slate-blue/ivory visual system to Scrapboard, add persistent light/dark mode to login and app shells, and preserve business and thermal receipt behavior.

**Architecture:** Keep the existing inline-rendered app architecture. Add centralized theme tokens and scoped overrides in `public/index.html`, expose theme initialization/toggling from `public/app.ts`, regenerate `public/app.js`, and verify behavior with source/markup tests plus the full suite.

**Tech Stack:** TypeScript, generated browser bundle, inline CSS, Node test runner, existing npm build/test scripts.

**Spec:** `docs/superpowers/specs/2026-11-22-scrapboard-theme-design.md`

## Global Constraints

- No changes to Gold Trading or any other project.
- No changes to database schemas, calculations, authentication rules, RawBT integration, or Bluetooth behavior.
- The preference key is separate from `zpp_gold_db` and invalid/storage-failure cases fall back safely.
- The thermal paper remains black-and-white/thermal-friendly; only surrounding Scrapboard preview chrome may use the selected theme.
- Update the app.js cache-busting version when the generated bundle changes.
- Keep mobile/tablet layouts responsive and use accessible focus states and labels.

## Review Focus

- First-load theme fallback: test system dark preference when no saved choice exists.
- Invalid or unavailable storage: test fallback without breaking initialization.
- Login/app parity: test both theme controls update the same root theme state.
- Legacy hard-coded panels: test that Scrapboard-scoped overrides cover cashflow, rate hero, final payout, cards, forms, tables, and modal surfaces.
- Print safety: test that thermal receipt print selectors remain present and theme overrides do not target the paper.

### Task 1: Add theme behavior tests

**Files:**
- Modify: `tests/scrapboard-custom-items.test.mjs` or create `tests/scrapboard-theme.test.mjs`
- Read: `public/app.ts`, `public/index.html`

**Interfaces:**
- Produces executable source/markup assertions for `SCRAPBOARD_THEME_KEY`, theme initialization, toggle controls, cache version, and scoped light/dark tokens.

- [ ] **Step 1: Write failing tests** for a separate preference key, root theme initialization/fallback, two accessible theme controls, cache-busting update, and Scrapboard-only theme selectors.
- [ ] **Step 2: Run the focused test file** and confirm it fails because the new theme behavior/markup is absent.
- [ ] **Step 3: Commit** the failing tests only.

### Task 2: Implement theme state and controls

**Files:**
- Modify: `public/app.ts` near app-shell/auth initialization and global handlers
- Modify: `public/index.html` login markup, sidebar/footer markup, and script cache version
- Modify: generated `public/app.js` through the project build

**Interfaces:**
- Produces `SCRAPBOARD_THEME_KEY`, `initializeScrapboardTheme()`, `applyScrapboardTheme(theme, persist?)`, `toggleScrapboardTheme()`, and synchronized `[data-theme-toggle]` controls.

- [ ] **Step 1: Implement safe theme helpers** with `light|dark` normalization, `localStorage` guard, `matchMedia` fallback, root `data-theme`, and synchronized accessible labels.
- [ ] **Step 2: Add a login toggle and authenticated-shell toggle** using the shared handler; include explicit mobile placement rules.
- [ ] **Step 3: Regenerate `public/app.js`** and bump the cache-busting query version in `public/index.html`.
- [ ] **Step 4: Run the focused tests** and confirm they pass.
- [ ] **Step 5: Commit** theme state and control implementation.

### Task 3: Implement the visual system

**Files:**
- Modify: `public/index.html` theme variables and Scrapboard-scoped visual layer

**Interfaces:**
- Consumes the root `data-theme` state from Task 2.
- Produces light/dark token rules for app shell, login, navigation, headings, buttons, inputs, cards, tables, modal surfaces, cashflow panels, rate hero, buying summaries, inventory, sales, and semantic states.

- [ ] **Step 1: Add light and dark token blocks** with slate-blue/ivory values, native `color-scheme`, readable borders/focus states, and comfortable contrast.
- [ ] **Step 2: Replace/override legacy gold, sage, and charcoal Scrapboard surfaces** with token-based selectors while leaving thermal receipt paper styles unchanged.
- [ ] **Step 3: Add responsive rules** for toggle placement and narrow forms/cards/tables.
- [ ] **Step 4: Run focused theme markup/style tests** and the existing visual-layer test.
- [ ] **Step 5: Commit** the visual refresh.

### Task 4: Full verification and handoff

**Files:**
- Read: all changed files and current git diff

- [ ] **Step 1: Run `npm run build`** and confirm exit 0.
- [ ] **Step 2: Run `npm test`** and confirm zero failures.
- [ ] **Step 3: Run a final diff/status review** confirming no Gold project files changed and the unrelated existing spec remains untouched.
- [ ] **Step 4: Commit any final generated/cache-version changes** if still unstaged.

