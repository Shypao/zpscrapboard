# Responsive Buying and RawBT Printing Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove responsive overlap in the buying payout cards and clarify the RawBT direct-print behavior.

**Architecture:** Keep the current CSS/client monolith and existing ESC/POS intent bridge. Use CSS grid minimum widths plus focused source-level regression tests, then build and deploy the static public bundle through the repository's Vercel configuration.

**Tech Stack:** TypeScript, browser HTML/CSS, Node test runner, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-12-responsive-printing-fix-design.md`

## Global Constraints

- Do not change receipt data, printer pairing, or ESC/POS command semantics.
- Do not claim Scrapboard can remove RawBT's third-party license notice.
- Run the full test suite and production build before deployment.

## Review Focus

- Intermediate widths where four payout cards no longer fit: verify cards wrap without horizontal overflow.
- Narrow quantity/rate fields: verify grid children can shrink without overlapping controls.
- Android direct mode: verify the UI explains the RawBT free-version notice and keeps Browser print available.
- Existing ESC/POS bridge: verify raw intent and receipt bytes remain unchanged.

### Task 1: Responsive payout layout

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.ts`
- Test: `tests/liquidation-card-layout.test.mjs`

- [ ] Add a failing source-level regression test for auto-fit payout columns, shrinkable payout children, and shrinkable scrapbook buying controls.
- [ ] Run the focused test and confirm it fails against the current fixed grid.
- [ ] Implement the smallest CSS changes that make the payout grid auto-fit and prevent child overflow at intermediate widths; keep the generated client source aligned.
- [ ] Run the focused test and confirm it passes.

### Task 2: RawBT user-facing clarification

**Files:**
- Modify: `public/app.ts`
- Test: `tests/direct-thermal-print.test.mjs`

- [ ] Add a failing assertion that Android RawBT setup copy identifies the free-version notice as coming from RawBT and preserves the Browser print fallback.
- [ ] Run the focused test and confirm it fails.
- [ ] Update only the print-help copy; keep the existing raw base64 intent unchanged.
- [ ] Run the focused test and confirm it passes.

### Task 3: Verification and deployment

**Files:** none beyond generated build output.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck` and `npm run build`.
- [ ] Deploy with the configured Vercel project and verify the returned URL responds.
