# Quick Add Categories and Items

## Intent

Allow an administrator to add new scrapboard categories and buying items as the business accepts more classifications. A newly added item must immediately appear on both Daily Rates and the Buying page and remain available after refresh or server restart.

## Selected approach

Use a small Quick Add panel on Daily Rates. This was selected instead of a full item manager to keep the workflow fast and simple.

The administrator can:

- add a category by name;
- add an item under an existing category;
- enter the item name, buying unit (`kg` or `pc`), and starting daily rate.

There is no edit, delete, deactivate, or reordering workflow in this version.

## Behavior

- Built-in categories and items remain available.
- Custom categories and items are stored in the existing shared ledger state, not only in the browser.
- Category and item names are required and trimmed before saving.
- Category names and item names within the same category must be unique without regard to capitalization.
- Rates must be positive numbers.
- New categories appear as new Daily Rates sections and Buying-page option groups.
- New items appear as compact rate cards and as selectable Buying items immediately after saving.
- Receipts, inventory, dashboard classification totals, and CSV exports use the custom item name normally.
- Only administrators can use Quick Add; staff can use the resulting items but cannot create them.

## Non-goals

- Editing, deleting, hiding, or reordering categories and items.
- Importing many items from a spreadsheet.
- Changing historical transactions when an item is added.

## Safety and compatibility

Custom item keys are generated internally and never depend directly on raw user-entered text. Existing transactions and built-in rates remain unchanged. Invalid or duplicate entries show a clear message and are not saved.
