# Responsive Buying and RawBT Printing Fix

## Intent

Keep the Add scrapbook item and payout summary readable at desktop, tablet,
and phone widths, and make the Android RawBT printing path explicit so users do
not mistake the RawBT free-version notice for a Scrapboard watermark.

## Goals

- Prevent payout summary cards and rate controls from overlapping or being
  clipped at intermediate widths.
- Preserve the existing ESC/POS RawBT bridge and browser-print fallback.
- Tell users that the free RawBT app may add its own license notice.

## Non-goals

- Removing a watermark added by RawBT's unlicensed app; Scrapboard cannot
  remove a third-party app's license notice.
- Changing printer transport, printer pairing, or transaction data.

## Approach

Use the existing CSS grid and print functions. Replace the payout calculator's
fixed column count with responsive minimum-width columns, constrain grid
children, and add a focused layout regression test. Keep direct RawBT printing
as raw ESC/POS over the existing documented intent, while adding accurate UI
copy about the free-version notice and the browser fallback.

## Constraints

The implementation stays in the existing client bundle (`public/index.html`
and `public/app.ts`), with the generated `public/app.js` rebuilt by the
existing TypeScript client build. Automated tests must continue to pass before
Vercel deployment.
