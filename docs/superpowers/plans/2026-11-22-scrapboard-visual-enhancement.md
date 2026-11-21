# Scrapboard Visual Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Scrapboard pages a premium charcoal/copper visual treatment with restrained animations while leaving Gold and all business logic unchanged.

**Architecture:** Add Scrapboard-scoped CSS selectors in `public/index.html`, reuse existing CSS variables and component classes, and add a small markup hook only where existing pages need a reliable scope. No JavaScript behavior or data model changes.

**Tech Stack:** Inline CSS in `public/index.html`, TypeScript-generated client bundle, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-22-scrapboard-visual-enhancement-design.md`

## Global Constraints

- Scrapboard-only styling; Gold remains unchanged.
- No changes to calculations, inventory, pooling, printing, or permissions.
- Animations must be short, non-blocking, and disabled for `prefers-reduced-motion: reduce`.

## Review Focus

- Gold pages must not receive Scrapboard-specific selectors or animation behavior; test markup scope.
- Tablet/mobile layouts must retain usable controls; verify existing responsive test suite.
- Reduced-motion users must not receive nonessential movement; test the CSS rule.
- Thermal receipt markup must remain unchanged; run receipt tests.

### Task 1: Add premium Scrapboard visual layer

**Files:**
- Modify: `public/index.html` CSS block and Scrapboard page wrapper markup
- Test: `tests/scrapboard-custom-items.test.mjs` or a focused style test

**Interfaces:**
- Consumes: existing `scrap-*`, inventory, and page wrapper classes.
- Produces: Scrapboard scope hook and CSS animation/reduced-motion rules.

- [ ] Write a failing test asserting the Scrapboard scope and reduced-motion rule exist.
- [ ] Run the focused test and confirm it fails for the missing style hooks.
- [ ] Add the scoped premium palette, card/button states, subtle entry/hover animations, and reduced-motion override.
- [ ] Run the focused and full test suites; confirm no Gold/receipt regressions.
- [ ] Run `git diff --check`, review the diff, and commit as `feat: enhance scrapboard visual style`.

