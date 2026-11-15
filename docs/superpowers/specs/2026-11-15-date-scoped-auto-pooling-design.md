# Date-Scoped Automatic Scrapboard Pooling

## Intent

Automatic scrapboard pooling must stay reviewable by buying date. Matching category and classification records may pool only when their purchase dates are the same.

## Goals

- Keep automatic pooling for matching scrapboard records on the same date.
- Keep records from different dates in separate automatic pools.
- Preserve existing pool behavior for classification/category matching, later same-date additions, and unrelated records.
- Allow kg-priced scrapboard items to be entered in grams while calculating the kg-based payout automatically.

## Non-goals

- Do not change manual pooling, liquidation, inventory quantities, or existing historical pools.
- Do not merge or migrate pools that were already created before this change.
- Keep pc-priced items as whole-piece quantities.

## Decision

Extend the automatic pool match key from `category + classification` to `date + category + classification`. Existing automatic pools without a date-scoped key remain untouched; new records use the date-scoped key.

For a kg-priced item, the form input is grams. The stored `purchaseQuantity` remains kilograms for compatibility, while inventory weight remains grams and the payout is `grams / 1000 * rate-per-kg`.

## Verification

Add regression coverage for same-date pooling and rejection of cross-date pooling, then run the full test suite and typecheck before deployment.
