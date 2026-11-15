# Date-Scoped Automatic Scrapboard Pooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make automatic scrapboard pools separate by purchase date and allow kg-priced purchases to be entered in grams with automatic conversion.

**Architecture:** Add the normalized purchase date to the existing automatic pool match key. Keep the existing internal kg storage model, but convert gram input at the form boundary so existing inventory and receipt logic remains compatible.

**Tech Stack:** TypeScript client source compiled to `public/app.js`, Node test runner, Vercel deployment through GitHub.

**Spec:** `docs/superpowers/specs/2026-11-15-date-scoped-auto-pooling-design.md`

## Global Constraints

- Same category, classification, and purchase date must auto-pool.
- Different purchase dates must not auto-pool.
- Existing manual pooling and historical pools remain unchanged.
- kg-priced inputs are grams; pc-priced inputs are whole pieces.

## Review Focus

- Same-date records from different sellers still combine — covered by the existing same-category/classification test.
- Cross-date records stay separate — covered by the new regression test.
- Later matching records append only to the same-date pool — covered by updated later-purchase tests.
- Different classifications/categories remain separate — covered by the existing negative test.
- kg input of `260` at `PHP 1,280/kg` calculates `PHP 332.80` and stores `0.26 kg` — covered by the quantity conversion test.

### Task 1: Date-scoped automatic pool key

**Files:**
- Modify: `public/app.ts` (`automaticScrapboardPoolKey`)
- Regenerate: `public/app.js`
- Test: `tests/scrapboard-auto-pooling.test.mjs`

**Interfaces:**
- Consumes: inventory record `date`, `scrapboardCategoryKey`, and `karat`.
- Produces: an automatic match key containing normalized date, category, and classification.

- [ ] **Step 1: Add a failing cross-date regression test**

Create two otherwise matching records with different dates, call `autoPoolMatchingScrapboardInventory` for the newer record, and assert that no pool is created and no record receives `inventoryPoolId`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/scrapboard-auto-pooling.test.mjs`

Expected: the new cross-date test fails because the current key does not include date.

- [ ] **Step 3: Include normalized date in `automaticScrapboardPoolKey`**

Keep the existing normalized category and classification components, prepend the trimmed record date, and keep the separator unambiguous.

- [ ] **Step 4: Update the later matching test to assert same-date append**

Keep the existing three records on one date and assert that all three remain in one automatic pool. Add a separate different-date record and assert it creates/joins a different pool only when processed.

- [ ] **Step 5: Build and run verification**

Run `npm run build`, `npm test`, and `npm run typecheck`. Expected: all tests pass and generated `public/app.js` matches the TypeScript source.

- [ ] **Step 6: Commit and deploy**

Commit the source, generated bundle, tests, and spec/plan documents; push `main`; verify the Vercel status is `success` for the commit.

### Task 2: Gram input for kg-priced items

**Files:**
- Modify: `public/app.ts` (`renderBuying`, `recalcBuying`, `purchaseItemFromForm`)
- Regenerate: `public/app.js`
- Test: `tests/scrapboard-quantity.test.mjs`

**Interfaces:**
- Consumes: entered quantity and catalog unit (`kg` or `pc`).
- Produces: normalized purchase quantity, inventory weight, and calculated payout.

- [ ] **Step 1: Write the failing conversion test**

Assert that `260` grams for a `kg` item becomes `0.26` stored kilograms, `260` inventory grams, and a payout of `332.80` at `PHP 1,280/kg`; assert that `2` for a `pc` item stays `2` pieces.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/scrapboard-quantity.test.mjs`

Expected: FAIL because the current code treats kg input as kilograms.

- [ ] **Step 3: Add the unit conversion boundary**

Use grams as the kg form input, convert to kilograms only for payout and `purchaseQuantity`, keep inventory weight in grams, and keep pc input as whole pieces. Update labels, step size, unit display, and quantity preview accordingly.

- [ ] **Step 4: Run the focused test and full verification**

Run `npm run build`, `npm test`, and `npm run typecheck`. Expected: all tests pass.
