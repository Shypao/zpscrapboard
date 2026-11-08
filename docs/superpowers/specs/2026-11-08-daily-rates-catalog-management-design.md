# Daily Rates Catalog Management Design

**Intent:** Let an administrator manage scrapboard categories and items without leaving Daily Rates.

**Goals:** Add compact edit controls beside categories and rate cards; support category rename/deactivate and item rename/move/unit/deactivate; allow permanent deletion only for unused custom entries; keep deactivated entries out of Buying and rate exports while preserving historical records; keep all catalog changes in shared Turso pricing state.

**Non-goals:** Staff catalog management, rewriting historical transactions, or permanently deleting built-in definitions.

**Safety:** Built-in or historically referenced entries use deactivate instead of destructive deletion. Duplicate names, empty names, invalid units, and removal of non-empty categories are rejected. Failed or stale saves restore the visible catalog state.

**Approaches considered:** (1) Replace the entire catalog with a new normalized schema—cleanest long-term but unnecessarily risky for existing transactions. (2) Permit edits only for custom entries—simpler but does not meet the delegated requirement to manage the full list. (3) Layer persistent category labels, item overrides, and disabled flags over the existing stable keys—chosen because transaction keys and current Turso data remain compatible.

**UI:** The existing Quick Add stays at the top. Each category heading gets Manage controls. Each rate card gets an admin-only Edit action. Editing uses compact in-page dialogs within Daily Rates, with explicit Save, Deactivate/Activate, and conditional Delete actions.

