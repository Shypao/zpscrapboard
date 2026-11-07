# Quick Add Categories and Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-only Quick Add controls that persist custom scrapboard categories and items and make new items immediately available in Daily Rates and Buying.

**Architecture:** Extend the existing `pricing` state with a `customScrapboardItems` array. Build one combined item catalog from built-in and custom definitions, then make the rates renderer, buying selector, receipt labels, and rate export consume that catalog. Keep implementation in the established client monolith and use the existing `/api/state` save path.

**Tech Stack:** TypeScript, browser DOM/templates, Node test runner, existing Express/SQLite state API

**Spec:** `docs/superpowers/specs/2026-11-08-quick-add-categories-items-design.md`

## Global Constraints

- Quick Add is available only to administrators.
- Each item has a category, name, unit (`kg` or `pc`), and positive starting rate.
- Custom definitions persist in shared ledger state and survive refresh/server restart.
- No edit, delete, deactivate, reordering, or spreadsheet import is included.
- Existing built-in items and historical transactions remain unchanged.

## Review Focus

- Blank or whitespace-only category/item names must be rejected without saving.
- Category names and item names within one category must reject case-insensitive duplicates.
- Invalid units or zero/negative/non-numeric rates must be rejected.
- Generated keys must not collide when similar names are added.
- Staff users must see custom items but must not see or invoke Quick Add controls.

---

### Task 1: Persistent Custom Item Catalog

**Files:**
- Modify: `public/app.ts` (pricing normalization and scrapboard catalog helpers)
- Test: `tests/scrapboard-custom-items.test.mjs`

**Interfaces:**
- Produces: `scrapboardItems(): ScrapboardItem[]`, `addScrapboardCategory(name: string): Promise<boolean>`, and `addScrapboardItem(category: string, name: string, unit: 'kg'|'pc', rate: number): Promise<boolean>`.
- Persists: `db.pricing.customScrapboardCategories: string[]` and `db.pricing.customScrapboardItems: ScrapboardItem[]`.

- [ ] **Step 1: Write failing catalog tests**

Test default normalization, successful category/item creation, shared-state persistence call, case-insensitive duplicate rejection, blank input rejection, invalid unit/rate rejection, collision-safe keys, and staff authorization rejection.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/scrapboard-custom-items.test.mjs`

Expected: FAIL because the custom catalog interfaces do not exist.

- [ ] **Step 3: Implement pricing normalization and catalog helpers**

Initialize missing arrays in `ensureShape()`. Return built-in plus custom items from `scrapboardItems()`. Generate `CUSTOM_<slug>_<random>` keys, validate inputs, call the existing `savePricingDB()`, and restore the prior state if saving fails.

- [ ] **Step 4: Run the focused test and verify pass**

Run: `node --test tests/scrapboard-custom-items.test.mjs`

Expected: all catalog tests pass.

- [ ] **Step 5: Commit**

Commit message: `feat: persist custom scrapboard items`

### Task 2: Daily Rates Quick Add UI

**Files:**
- Modify: `public/app.ts` (`renderRates`, Quick Add modal/panel handlers, catalog consumers)
- Modify: `public/index.html` (compact Quick Add styles)
- Test: `tests/scrapboard-custom-items.test.mjs`

**Interfaces:**
- Consumes: Task 1 catalog and creation functions.
- Produces: `openScrapboardQuickAdd()`, `submitScrapboardCategory()`, and `submitScrapboardItem()` browser handlers.

- [ ] **Step 1: Write failing Daily Rates UI tests**

Assert that admins see “Add category” and “Add item,” staff do not, saved categories populate the item form, and a newly saved item renders as a compact rate card under its category.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/scrapboard-custom-items.test.mjs`

Expected: FAIL because Quick Add controls are absent.

- [ ] **Step 3: Implement the Quick Add modal and compact styles**

Use the existing modal, field, button, toast, and role patterns. Close and rerender after successful saves; keep the modal open with a clear message after validation failure.

- [ ] **Step 4: Run the focused test and verify pass**

Run: `node --test tests/scrapboard-custom-items.test.mjs`

Expected: all Quick Add UI tests pass.

- [ ] **Step 5: Commit**

Commit message: `feat: add quick category and item controls`

### Task 3: Buying and Export Integration

**Files:**
- Modify: `public/app.ts` (`renderBuying`, `scrapboardItem`, rate setup/export consumers)
- Test: `tests/scrapboard-custom-items.test.mjs`
- Test: existing full test suite

**Interfaces:**
- Consumes: `scrapboardItems()` and persisted rates from Task 1.
- Produces: custom item options in Buying and rows in `scrapboard_daily_rates.csv`.

- [ ] **Step 1: Write failing integration tests**

Assert that a custom item appears under its custom category in Buying, uses its saved unit and rate in a purchase line, renders its name on receipt/inventory paths, and appears in the daily-rate CSV source.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/scrapboard-custom-items.test.mjs`

Expected: FAIL because Buying and export still use only the built-in constant.

- [ ] **Step 3: Route all active Scrapboard catalog consumers through `scrapboardItems()`**

Keep historical line labels self-contained so removing or changing catalog data cannot alter old transactions.

- [ ] **Step 4: Run focused and full verification**

Run: `npm run build && node --test tests/scrapboard-custom-items.test.mjs && npm test`

Expected: TypeScript build succeeds and all tests pass.

- [ ] **Step 5: Restart and smoke-test localhost**

Restart `npm start`; verify `/` returns HTTP 200, `/website` returns 404, and the served `app.js` contains Quick Add handlers.

- [ ] **Step 6: Commit**

Commit message: `feat: use custom items in buying and rates`
